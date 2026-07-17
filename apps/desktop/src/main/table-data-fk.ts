/**
 * Foreign-key metadata + search.
 *
 * The renderer uses this to surface a searchable dropdown when editing an
 * FK column.  Two responsibilities live here:
 *
 *   1. `resolveForeignKeys` — for a single (schema, table), return the
 *      single-column FKs declared on it, each with a heuristically-picked
 *      label column on the parent table.  Composite FKs are skipped — the
 *      column falls back to the plain type editor.
 *
 *   2. `searchForeignKey` — given a parent (schema, table, valueColumn,
 *      labelColumn?), return up to N options matching the user's query.
 *      Read-only; not gated by `readOnlyMode`.
 *
 * No write path lives in this file.
 */

import type { PoolClient } from "pg";
import type {
  ForeignKeyRef,
  ForeignKeyOption,
  SearchForeignKeyParams,
  SearchForeignKeyResult,
} from "../shared/types/table-data";
import { quoteIdent, withPoolClient } from "./pg-utils";

// ---------------------------------------------------------------------------
// Label-column heuristic
// ---------------------------------------------------------------------------

/**
 * Curated, ordered list of column names that are good "display" columns
 * when a parent table doesn't declare one explicitly.  Names earlier in
 * this list outrank later ones — `name` beats `email`, which beats `slug`.
 *
 * The list is intentionally small; the override (Phase 3.1, deferred)
 * handles cases the heuristic gets wrong.
 */
const LABEL_COLUMN_PRIORITY: readonly string[] = [
  "name",
  "display_name",
  "full_name",
  "title",
  "label",
  "email",
  "slug",
  "code",
  "description",
];

/**
 * Pick a label column on the given parent table, if any.  Looks only at
 * NOT NULL textual columns whose names appear in `LABEL_COLUMN_PRIORITY`.
 * Returns `null` when no candidate matches — the dropdown will then show
 * the PK alone, which is the right answer for ID-only entities.
 */
async function pickLabelColumn(
  client: PoolClient,
  schema: string,
  table: string,
): Promise<string | null> {
  const result = await client.query<{ column_name: string }>(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = $1 AND table_name = $2
      AND is_nullable = 'NO'
      AND data_type IN (
        'text', 'character varying', 'character', 'citext', 'name'
      )
      AND lower(column_name) = ANY ($3::text[])
    `,
    [schema, table, LABEL_COLUMN_PRIORITY],
  );

  if (result.rows.length === 0) return null;
  let best: { name: string; rank: number } | null = null;
  for (const row of result.rows) {
    const rank = LABEL_COLUMN_PRIORITY.indexOf(row.column_name.toLowerCase());
    if (rank < 0) continue;
    if (best === null || rank < best.rank) {
      best = { name: row.column_name, rank };
    }
  }
  return best?.name ?? null;
}

// ---------------------------------------------------------------------------
// FK resolution
// ---------------------------------------------------------------------------

/**
 * Returns the single-column foreign keys declared on `schema.table`,
 * keyed by the column name on the *child* (the table being edited).
 * Composite FKs are excluded.  Each entry includes a heuristically-picked
 * label column on the parent.
 *
 * Caller passes a `valueCastByColumn` map to associate each FK with the
 * pg type of the child column (so the eventual UPDATE has a valid cast).
 */
export async function resolveForeignKeys(
  client: PoolClient,
  schema: string,
  table: string,
  valueCastByColumn: Map<string, string>,
): Promise<Map<string, ForeignKeyRef>> {
  // Fetch only single-column FKs (`array_length(conkey, 1) = 1`).
  const fkResult = await client.query<{
    child_column: string;
    parent_schema: string;
    parent_table: string;
    parent_column: string;
  }>(
    `
    SELECT
      ca.attname AS child_column,
      pn.nspname AS parent_schema,
      pc.relname AS parent_table,
      pa.attname AS parent_column
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    JOIN pg_class cc    ON cc.oid = c.conrelid
    JOIN pg_class pc    ON pc.oid = c.confrelid
    JOIN pg_namespace pn ON pn.oid = pc.relnamespace
    JOIN pg_attribute ca
      ON ca.attrelid = c.conrelid AND ca.attnum = c.conkey[1]
    JOIN pg_attribute pa
      ON pa.attrelid = c.confrelid AND pa.attnum = c.confkey[1]
    WHERE c.contype = 'f'
      AND array_length(c.conkey, 1) = 1
      AND n.nspname = $1
      AND cc.relname = $2
    `,
    [schema, table],
  );

  // Cache label-column lookups by parent (schema, table) so a child with
  // multiple FKs to the same parent only does the lookup once.
  const labelCache = new Map<string, string | null>();
  const out = new Map<string, ForeignKeyRef>();

  for (const row of fkResult.rows) {
    const cacheKey = `${row.parent_schema}.${row.parent_table}`;
    let labelColumn: string | null;
    if (labelCache.has(cacheKey)) {
      labelColumn = labelCache.get(cacheKey)!;
    } else {
      labelColumn = await pickLabelColumn(
        client,
        row.parent_schema,
        row.parent_table,
      );
      labelCache.set(cacheKey, labelColumn);
    }
    const valuePgCast = valueCastByColumn.get(row.child_column) ?? "text";
    out.set(row.child_column, {
      schema: row.parent_schema,
      table: row.parent_table,
      column: row.parent_column,
      labelColumn,
      valuePgCast,
    });
  }

  return out;
}

// ---------------------------------------------------------------------------
// Search handler
// ---------------------------------------------------------------------------

const SEARCH_LIMIT_MAX = 200;
const SEARCH_LIMIT_DEFAULT = 50;

/**
 * Resolve up to `limit` candidate rows on the parent table for an FK
 * dropdown.  Empty `query` returns the first page ordered by the label
 * column (or value column when there is no label).
 *
 * Read-only: this does not honour `readOnlyMode` — picking is not writing.
 */
export async function searchForeignKey(
  params: SearchForeignKeyParams,
): Promise<SearchForeignKeyResult> {
  const limit = clampLimit(params.limit);

  return withPoolClient(params.connectionId, async (client) => {
    const qualifiedTable = `${quoteIdent(params.schema)}.${quoteIdent(params.table)}`;
    const valueIdent = quoteIdent(params.valueColumn);
    const labelIdent = params.labelColumn
      ? quoteIdent(params.labelColumn)
      : null;

    const selectList = labelIdent
      ? `${valueIdent} AS value, ${labelIdent} AS label`
      : `${valueIdent} AS value, NULL::text AS label`;

    const orderBy = labelIdent ? `${labelIdent}, ${valueIdent}` : valueIdent;

    let sql: string;
    let values: unknown[];

    if (params.query.trim() === "") {
      sql = `
        SELECT ${selectList}
        FROM ${qualifiedTable}
        ORDER BY ${orderBy}
        LIMIT $1
      `;
      values = [limit + 1];
    } else {
      const pattern = `%${params.query}%`;
      // Always search the value column as text (cheap, works for ints/uuids).
      // When a label exists, also search it.  ILIKE is fine here — schema-
      // wide indexes (pg_trgm GIN) are a parent-table concern, not ours.
      const where = labelIdent
        ? `${valueIdent}::text ILIKE $1 OR ${labelIdent} ILIKE $1`
        : `${valueIdent}::text ILIKE $1`;
      sql = `
        SELECT ${selectList}
        FROM ${qualifiedTable}
        WHERE ${where}
        ORDER BY ${orderBy}
        LIMIT $2
      `;
      values = [pattern, limit + 1];
    }

    const result = await client.query<{ value: unknown; label: string | null }>(
      sql,
      values,
    );

    const hasMore = result.rows.length > limit;
    const trimmed = hasMore ? result.rows.slice(0, limit) : result.rows;
    const options: ForeignKeyOption[] = trimmed.map((r) => ({
      value: r.value,
      label: r.label,
    }));
    return { options, hasMore };
  });
}

function clampLimit(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return SEARCH_LIMIT_DEFAULT;
  if (raw > SEARCH_LIMIT_MAX) return SEARCH_LIMIT_MAX;
  return Math.floor(raw);
}
