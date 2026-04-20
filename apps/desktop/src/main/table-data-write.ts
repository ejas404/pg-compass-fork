import type { PoolClient } from "pg";
import type {
  UpdateCellParams,
  UpdateCellResult,
} from "../shared/types/table-data";
import { quoteIdent, withPoolClient } from "./pg-utils";
import { getSettings } from "./settings-store";

/**
 * Allow-listed Postgres type names that may appear as an explicit cast
 * (`$n::<cast>`) in the UPDATE we build. Anything outside this set is
 * rejected before reaching the database.
 *
 * Array types are spelled with the leading underscore form (`_int4`,
 * `_text`) so we never emit `int4[]` from user-controlled input.
 */
const SAFE_PG_CAST = new Set<string>([
  "text",
  "varchar",
  "bpchar",
  "name",
  "char",
  "citext",
  "bool",
  "int2",
  "int4",
  "int8",
  "oid",
  "float4",
  "float8",
  "numeric",
  "money",
  "uuid",
  "bytea",
  "json",
  "jsonb",
  "date",
  "time",
  "timetz",
  "timestamp",
  "timestamptz",
  "interval",
  "inet",
  "cidr",
  "macaddr",
  "macaddr8",
  "xml",
  "bit",
  "varbit",
  "regclass",
  "regtype",
  "int4range",
  "int8range",
  "numrange",
  "tsrange",
  "tstzrange",
  "daterange",
  "tsvector",
  "tsquery",
  "_text",
  "_varchar",
  "_bool",
  "_int2",
  "_int4",
  "_int8",
  "_float4",
  "_float8",
  "_numeric",
  "_uuid",
  "_json",
  "_jsonb",
  "_date",
  "_timestamp",
  "_timestamptz",
  "geometry",
  "geography",
  "vector",
]);

/**
 * Throws if `pgCast` is not on the allowlist. Keeping the check here (and
 * not in the renderer) ensures the main process remains authoritative.
 */
export function assertSafePgCast(pgCast: string): void {
  if (!SAFE_PG_CAST.has(pgCast)) {
    throw new Error(`Unsupported or unsafe cast: ${pgCast}`);
  }
}

/**
 * Verifies that `pgCast` refers to a user-defined enum type that actually
 * exists in the connected database. Use this branch only when the static
 * allowlist fails. The cast string must exactly match the catalog-derived
 * schema-qualified representation (`quote_ident(schema) || '.' ||
 * quote_ident(typname)`), which keeps the SQL interpolation safe without
 * relying on the session search_path.
 */
async function assertEnumCast(
  client: PoolClient,
  pgCast: string,
): Promise<void> {
  const result = await client.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1
       FROM pg_type t
       JOIN pg_namespace n ON n.oid = t.typnamespace
       WHERE t.typtype = 'e'
         AND (
           '"' || replace(n.nspname, '"', '""') || '"."'
           || replace(t.typname, '"', '""') || '"'
         ) = $1
     ) AS exists`,
    [pgCast],
  );
  if (!result.rows[0]?.exists) {
    throw new Error(`Unsupported or unsafe cast: ${pgCast}`);
  }
}

export async function updateCell(
  params: UpdateCellParams,
): Promise<UpdateCellResult> {
  const settings = getSettings();
  if (settings.general.readOnlyMode) {
    throw new Error("Cannot update cell: read-only mode is enabled.");
  }

  if (params.pkColumns.length === 0) {
    throw new Error(
      "Cannot update cell: the table has no primary key to target.",
    );
  }
  if (params.pkColumns.length !== params.pkValues.length) {
    throw new Error(
      "Cannot update cell: pkColumns and pkValues must have the same length.",
    );
  }

  const castInAllowlist = params.setNull || SAFE_PG_CAST.has(params.pgCast);

  return withPoolClient(params.connectionId, async (client) => {
    if (!params.setNull && !castInAllowlist) {
      await assertEnumCast(client, params.pgCast);
    }

    const qualifiedTable = `${quoteIdent(params.schema)}.${quoteIdent(params.table)}`;
    const columnIdent = quoteIdent(params.column);
    const setClause = params.setNull
      ? `${columnIdent} = NULL`
      : `${columnIdent} = $1::${params.pgCast}`;

    const pkStart = params.setNull ? 1 : 2;
    const whereClause = params.pkColumns
      .map((col, i) => `${quoteIdent(col)} = $${pkStart + i}`)
      .join(" AND ");

    const values = params.setNull
      ? params.pkValues
      : [params.newValue, ...params.pkValues];

    const sql = `UPDATE ${qualifiedTable} SET ${setClause} WHERE ${whereClause} RETURNING *`;
    const result = await client.query(sql, values);

    if (result.rowCount === 0) {
      throw new Error(
        "Row not found: no rows matched the provided primary key.",
      );
    }
    if (result.rowCount && result.rowCount > 1) {
      throw new Error(
        `Unexpected row count (${result.rowCount}) from cell update.`,
      );
    }

    return { row: result.rows[0] as Record<string, unknown> };
  });
}
