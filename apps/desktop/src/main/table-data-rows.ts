import type { PoolClient } from "pg";
import type {
  ColumnInfo,
  ExecuteQueryParams,
  GetRowsParams,
  TableRowsResult,
} from "../shared/types/table-data";
import { quoteIdent, withPoolClient } from "./pg-utils";
import { buildTypeMap } from "./table-data-utils";

// ---------------------------------------------------------------------------
// GET_ROWS
// ---------------------------------------------------------------------------

export async function getRows(params: GetRowsParams): Promise<TableRowsResult> {
  return withPoolClient(params.connectionId, async (client) => {
    const qualifiedTable = `${quoteIdent(params.schema)}.${quoteIdent(params.table)}`;
    const whereFragment = params.whereClause?.trim()
      ? `WHERE ${params.whereClause}`
      : "";

    const offset = (params.page - 1) * params.pageSize;

    const countSql = `SELECT count(*) AS count FROM ${qualifiedTable} ${whereFragment}`;
    // Use a read-only transaction so count and data are consistent.
    await client.query("BEGIN READ ONLY");
    try {
      const countResult = await client.query<{ count: string }>(countSql);
      const totalCount = Number.parseInt(countResult.rows[0]!.count, 10);

      const dataResult = await client.query(
        `SELECT * FROM ${qualifiedTable} ${whereFragment} LIMIT $1 OFFSET $2`,
        [params.pageSize, offset],
      );

      await client.query("COMMIT");

      const typeMap = await buildTypeMap(
        client,
        dataResult.fields.map((f) => f.dataTypeID),
      );

      const columns: ColumnInfo[] = dataResult.fields.map((f) => ({
        name: f.name,
        dataTypeId: f.dataTypeID,
        dataType: typeMap.get(f.dataTypeID) ?? "unknown",
      }));

      return { columns, rows: dataResult.rows, totalCount };
    } catch (err) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw err;
    }
  });
}

// ---------------------------------------------------------------------------
// EXECUTE_QUERY
// ---------------------------------------------------------------------------

const ALLOWED_QUERY_PREFIXES = ["select", "with"];

function isReadOnlyQuery(sql: string): boolean {
  const trimmed = sql.trim().toLowerCase();
  return ALLOWED_QUERY_PREFIXES.some((prefix) => trimmed.startsWith(prefix));
}

/**
 * Strip trailing LIMIT and OFFSET clauses from a SQL string so we can
 * apply our own pagination wrapper without double-limiting.
 * Returns the cleaned SQL and the user-provided LIMIT (if any) so we can
 * honour it as an upper bound on totalCount.
 */
function stripLimitOffset(sql: string): {
  core: string;
  userLimit: number | null;
} {
  let core = sql;
  let userLimit: number | null = null;

  // Strip trailing OFFSET (must come after LIMIT in standard SQL)
  core = core.replace(/\s+OFFSET\s+\d+\s*$/i, "");

  // Strip trailing LIMIT and capture the value
  const limitMatch = /\s+LIMIT\s+(\d+)\s*$/i.exec(core);
  if (limitMatch?.[1]) {
    userLimit = Number.parseInt(limitMatch[1], 10);
    core = core.slice(0, -limitMatch[0].length);
  }

  return { core, userLimit };
}

export async function executeQuery(
  params: ExecuteQueryParams,
): Promise<TableRowsResult> {
  if (!isReadOnlyQuery(params.sql)) {
    throw new Error(
      "Only SELECT statements (including CTEs with WITH) are allowed.",
    );
  }

  return withPoolClient(params.connectionId, async (client) => {
    // Set the transaction to read-only for extra safety
    await client.query("BEGIN READ ONLY");

    try {
      const offset = (params.page - 1) * params.pageSize;
      const trimmedSql = params.sql.replace(/;\s*$/, "");
      const { core, userLimit } = stripLimitOffset(trimmedSql);

      const countResult = await client.query<{ count: string }>(
        `SELECT count(*) AS count FROM (${core}) AS __count_subquery`,
      );
      let totalCount = Number.parseInt(countResult.rows[0]!.count, 10);

      // Honour the user's LIMIT as an upper bound on total rows.
      if (userLimit !== null && userLimit < totalCount) {
        totalCount = userLimit;
      }

      const dataResult = await client.query(
        `SELECT * FROM (${core}) AS __data_subquery LIMIT $1 OFFSET $2`,
        [params.pageSize, offset],
      );

      await client.query("COMMIT");

      const typeMap = await buildTypeMap(
        client,
        dataResult.fields.map((f) => f.dataTypeID),
      );

      const columns: ColumnInfo[] = dataResult.fields.map((f) => ({
        name: f.name,
        dataTypeId: f.dataTypeID,
        dataType: typeMap.get(f.dataTypeID) ?? "unknown",
      }));

      return { columns, rows: dataResult.rows, totalCount };
    } catch (err) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw err;
    }
  });
}