import type { PoolClient } from "pg";
import { quoteIdent, withPoolClient } from "./pg-utils";

/**
 * PostgreSQL ARRAY subqueries may arrive as a string like "{a,b}" rather than
 * a JS array, depending on the `pg` type-parser configuration.  This helper
 * normalises the value to a proper string array.
 */
export function ensureArray(value: unknown): string[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    const inner = value.replace(/^\{|\}$/g, "");
    return inner === ""
      ? []
      : inner.split(",").map((s) => s.replace(/^"|"$/g, ""));
  }
  return [];
}

/** Build a type-name lookup from pg_type for a set of OIDs. */
export async function buildTypeMap(
  client: PoolClient,
  oids: number[],
): Promise<Map<number, string>> {
  if (oids.length === 0) return new Map();

  const unique = [...new Set(oids)];
  const result = await client.query<{ oid: string; typname: string }>(
    `SELECT oid, typname FROM pg_type WHERE oid = ANY($1::oid[])`,
    [unique],
  );

  const map = new Map<number, string>();
  for (const row of result.rows) {
    map.set(Number(row.oid), row.typname);
  }
  return map;
}