import type { PoolClient } from "pg";
import { quoteIdent } from "./pg-utils";

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

/**
 * Build a label lookup for enum-typed OIDs. Non-enum OIDs are absent from the
 * returned map, so callers can distinguish "no labels" (regular type) from
 * "empty labels" (enum with zero values, which PostgreSQL disallows anyway).
 */
export interface EnumTypeInfo {
  labels: string[];
  pgCast: string;
}

export async function buildEnumTypeMap(
  client: PoolClient,
  oids: number[],
): Promise<Map<number, EnumTypeInfo>> {
  if (oids.length === 0) return new Map();

  const unique = [...new Set(oids)];
  const result = await client.query<{
    oid: string;
    enumlabel: string;
    nspname: string;
    typname: string;
  }>(
    `
    SELECT t.oid, e.enumlabel, n.nspname, t.typname
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE t.oid = ANY($1::oid[])
    ORDER BY t.oid, e.enumsortorder
    `,
    [unique],
  );

  const map = new Map<number, EnumTypeInfo>();
  for (const row of result.rows) {
    const oid = Number(row.oid);
    const pgCast = `${quoteIdent(row.nspname)}.${quoteIdent(row.typname)}`;
    const existing = map.get(oid);
    if (existing) {
      existing.labels.push(row.enumlabel);
      continue;
    }
    map.set(oid, { labels: [row.enumlabel], pgCast });
  }
  return map;
}
