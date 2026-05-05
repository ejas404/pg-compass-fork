import { type WebContents } from "electron";
import fs from "node:fs";
import path from "node:path";
import { to as copyTo } from "pg-copy-streams";
import { TableDataChannels } from "../shared/types/table-data";
import type {
  ExportDataParams,
  ExportResult,
  SqlDumpParams,
} from "../shared/types/table-data";
import { quoteIdent, withPoolClient } from "./pg-utils";
import { isReadOnlyQuery } from "./table-data-rows";

// ---------------------------------------------------------------------------
// EXPORT_DATA (CSV / JSON)
// ---------------------------------------------------------------------------

/** Throttle progress IPC sends to avoid flooding the renderer. */
export function createProgressThrottle(sender: WebContents, intervalMs = 200) {
  let lastSent = 0;
  let pending: ReturnType<typeof setTimeout> | null = null;

  function send(rowCount: number) {
    const now = Date.now();
    if (now - lastSent >= intervalMs) {
      lastSent = now;
      sender.send(TableDataChannels.EXPORT_PROGRESS, rowCount);
    } else {
      pending ??= setTimeout(
        () => {
          pending = null;
          lastSent = Date.now();
          sender.send(TableDataChannels.EXPORT_PROGRESS, rowCount);
        },
        intervalMs - (now - lastSent),
      );
    }
  }

  function flush(rowCount: number) {
    if (pending) {
      clearTimeout(pending);
      pending = null;
    }
    sender.send(TableDataChannels.EXPORT_PROGRESS, rowCount);
  }

  return { send, flush };
}

/** Convert a row to a CSV line, properly quoting values. */
export function csvEscapeValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return csvQuoteField(JSON.stringify(value));
  if (typeof value === "symbol") return csvQuoteField(value.toString());
  return csvQuoteField(String(value as string | number | boolean | bigint));
}

export function csvQuoteField(str: string): string {
  if (
    str.includes(",") ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r")
  ) {
    return `"${str.replaceAll('"', '""')}"`;
  }
  return str;
}

/** Build the SQL to run for the export (either a full table or a user query). */
export function buildExportSql(params: ExportDataParams): string {
  if (params.sql) {
    if (!isReadOnlyQuery(params.sql)) {
      throw new Error("Only SELECT statements are allowed for export.");
    }
    return params.sql.replace(/;\s*$/, "");
  }
  const qualifiedTable = `${quoteIdent(params.schema!)}.${quoteIdent(params.table!)}`;
  return `SELECT * FROM ${qualifiedTable}`;
}

/** Write a batch of rows in CSV format. */
function writeCsvBatch(
  writeStream: fs.WriteStream,
  columns: string[],
  rows: Record<string, unknown>[],
  isFirstBatch: boolean,
): void {
  if (isFirstBatch) {
    writeStream.write(columns.map(csvEscapeValue).join(",") + "\n");
  }
  for (const row of rows) {
    const line = columns.map((col) => csvEscapeValue(row[col])).join(",");
    writeStream.write(line + "\n");
  }
}

/** Write a batch of rows in JSON format. */
function writeJsonBatch(
  writeStream: fs.WriteStream,
  rows: Record<string, unknown>[],
  startIndex: number,
): void {
  for (let i = 0; i < rows.length; i++) {
    const prefix = startIndex + i === 0 ? "  " : ",\n  ";
    writeStream.write(prefix + JSON.stringify(rows[i]));
  }
}

export async function exportData(
  params: ExportDataParams,
  sender: WebContents,
): Promise<ExportResult> {
  const { filePath } = params;

  return withPoolClient(params.connectionId, async (client) => {
    const sql = buildExportSql(params);
    const progress = createProgressThrottle(sender);

    // Stream all rows using a cursor to avoid loading everything into memory
    await client.query("BEGIN READ ONLY");
    try {
      const cursorName = "__export_cursor";
      await client.query(`DECLARE ${cursorName} CURSOR FOR ${sql}`);

      const writeStream = fs.createWriteStream(filePath, { encoding: "utf-8" });
      let rowCount = 0;
      let columns: string[] | null = null;
      const batchSize = 1000;

      if (params.format === "json") writeStream.write("[\n");

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const batch = await client.query(
          `FETCH ${batchSize} FROM ${cursorName}`,
        );
        if (batch.rows.length === 0) break;

        columns ??= batch.fields.map((f) => f.name);

        if (params.format === "csv") {
          writeCsvBatch(writeStream, columns, batch.rows, rowCount === 0);
        } else {
          writeJsonBatch(writeStream, batch.rows, rowCount);
        }
        rowCount += batch.rows.length;

        // Send throttled progress and yield the event loop so the renderer receives it
        progress.send(rowCount);
        await new Promise((r) => {
          setImmediate(r);
        });
      }

      if (params.format === "json") {
        writeStream.write(rowCount > 0 ? "\n]\n" : "]\n");
      }

      await client.query(`CLOSE ${cursorName}`);
      await client.query("COMMIT");

      await new Promise<void>((resolve, reject) => {
        writeStream.end(() => resolve());
        writeStream.on("error", reject);
      });

      return { filePath, rowCount };
    } catch (err) {
      await client.query("ROLLBACK").catch(() => undefined);
      // Clean up partial file
      try {
        fs.unlinkSync(filePath);
      } catch {
        /* ignore */
      }
      throw err;
    }
  });
}

// ---------------------------------------------------------------------------
// SQL_DUMP (COPY TO STDOUT)
// ---------------------------------------------------------------------------

export async function sqlDump(
  params: SqlDumpParams,
  sender: WebContents,
): Promise<ExportResult> {
  const { filePath } = params;
  const qualifiedTable = `${quoteIdent(params.schema)}.${quoteIdent(params.table)}`;

  return withPoolClient(params.connectionId, async (client) => {
    const fileStream = fs.createWriteStream(filePath, { encoding: "utf-8" });
    const progress = createProgressThrottle(sender);

    const copyStream = client.query(
      copyTo(`COPY ${qualifiedTable} TO STDOUT WITH (FORMAT text)`),
    );

    let rowCount = 0;
    copyStream.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf-8");
      const lines = text.split("\n").filter((l) => l.length > 0);
      rowCount += lines.length;
      progress.send(rowCount);
    });

    await new Promise<void>((resolve, reject) => {
      copyStream.pipe(fileStream);
      fileStream.on("finish", () => {
        progress.flush(rowCount);
        resolve();
      });
      copyStream.on("error", (err) => {
        fileStream.destroy();
        reject(err);
      });
      fileStream.on("error", (err) => {
        copyStream.destroy();
        reject(err);
      });
    });

    return { filePath: path.resolve(filePath), rowCount };
  });
}
