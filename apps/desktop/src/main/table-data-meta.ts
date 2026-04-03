import type { PoolClient } from "pg";
import type {
  ColumnStructure,
  ConstraintInfo,
  IndexInfo,
  TableMetaParams,
} from "../shared/types/table-data";
import { quoteIdent, withPoolClient } from "./pg-utils";
import { ensureArray } from "./table-data-utils";

// ---------------------------------------------------------------------------
// GET_STRUCTURE
// ---------------------------------------------------------------------------

type PgNumericField = number | string | null;

interface PgColumnRow {
  column_name: string;
  data_type: string;
  udt_name: string;
  is_nullable: string;
  column_default: string | null;
  ordinal_position: number | string;
  character_maximum_length: PgNumericField;
  numeric_precision: PgNumericField;
  numeric_scale: PgNumericField;
}

export async function getStructure(
  params: TableMetaParams,
): Promise<ColumnStructure[]> {
  return withPoolClient(params.connectionId, async (client) => {
    const colResult = await client.query<PgColumnRow>(
      `SELECT
        column_name,
        data_type,
        udt_name,
        is_nullable,
        column_default,
        ordinal_position,
        character_maximum_length,
        numeric_precision,
        numeric_scale
      FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2
      ORDER BY ordinal_position`,
      [params.schema, params.table],
    );

    // Fetch 5 sample rows for sample values per column
    const qualifiedTable = `${quoteIdent(params.schema)}.${quoteIdent(params.table)}`;
    const sampleResult = await client.query(
      `SELECT * FROM ${qualifiedTable} LIMIT 5`,
    );

    return colResult.rows.map((col) => ({
      name: col.column_name,
      dataType: col.data_type,
      udtName: col.udt_name,
      isNullable: col.is_nullable === "YES",
      columnDefault: col.column_default,
      ordinalPosition: Number(col.ordinal_position),
      characterMaxLength:
        col.character_maximum_length == null
          ? null
          : Number(col.character_maximum_length),
      numericPrecision:
        col.numeric_precision == null ? null : Number(col.numeric_precision),
      numericScale:
        col.numeric_scale == null ? null : Number(col.numeric_scale),
      sampleValues: sampleResult.rows.map(
        (row: Record<string, unknown>) => row[col.column_name] ?? null,
      ),
    }));
  });
}

// ---------------------------------------------------------------------------
// GET_INDEXES
// ---------------------------------------------------------------------------

interface PgIndexRow {
  index_name: string;
  definition: string;
  type: string;
  size: string;
  scans: string | number;
  tuples_read: string | number;
  tuples_fetched: string | number;
  is_unique: boolean;
  is_primary: boolean;
}

export async function getIndexes(params: TableMetaParams): Promise<IndexInfo[]> {
  return withPoolClient(params.connectionId, async (client) => {
    const result = await client.query<PgIndexRow>(
      `SELECT
        i.indexname AS index_name,
        i.indexdef AS definition,
        am.amname AS type,
        pg_size_pretty(pg_relation_size(ic.oid)) AS size,
        COALESCE(s.idx_scan, 0) AS scans,
        COALESCE(s.idx_tup_read, 0) AS tuples_read,
        COALESCE(s.idx_tup_fetch, 0) AS tuples_fetched,
        ix.indisunique AS is_unique,
        ix.indisprimary AS is_primary
      FROM pg_indexes i
      JOIN pg_class ic ON ic.relname = i.indexname
      JOIN pg_namespace n ON n.oid = ic.relnamespace AND n.nspname = i.schemaname
      JOIN pg_am am ON am.oid = ic.relam
      JOIN pg_index ix ON ix.indexrelid = ic.oid
      LEFT JOIN pg_stat_user_indexes s
        ON s.indexrelname = i.indexname AND s.schemaname = i.schemaname
      WHERE i.schemaname = $1 AND i.tablename = $2
      ORDER BY i.indexname`,
      [params.schema, params.table],
    );

    return result.rows.map((row) => ({
      name: row.index_name,
      definition: row.definition,
      type: row.type,
      size: row.size,
      scans: Number(row.scans),
      tuplesRead: Number(row.tuples_read),
      tuplesFetched: Number(row.tuples_fetched),
      isUnique: row.is_unique,
      isPrimary: row.is_primary,
    }));
  });
}

// ---------------------------------------------------------------------------
// GET_CONSTRAINTS
// ---------------------------------------------------------------------------

interface PgConstraintRow {
  constraint_name: string;
  constraint_type: string;
  column_names: string[];
  definition: string | null;
  foreign_table_schema: string | null;
  foreign_table_name: string | null;
  foreign_column_names: string[];
  check_clause: string | null;
}

export async function getConstraints(
  params: TableMetaParams,
): Promise<ConstraintInfo[]> {
  return withPoolClient(params.connectionId, async (client) => {
    const result = await client.query<PgConstraintRow>(
      `SELECT
        tc.conname AS constraint_name,
        CASE tc.contype
          WHEN 'p' THEN 'PRIMARY KEY'
          WHEN 'f' THEN 'FOREIGN KEY'
          WHEN 'u' THEN 'UNIQUE'
          WHEN 'c' THEN 'CHECK'
          WHEN 'x' THEN 'EXCLUDE'
          ELSE tc.contype::text
        END AS constraint_type,
        ARRAY(
          SELECT a.attname
          FROM unnest(tc.conkey) WITH ORDINALITY AS k(attnum, ord)
          JOIN pg_attribute a ON a.attrelid = tc.conrelid AND a.attnum = k.attnum
          ORDER BY k.ord
        ) AS column_names,
        pg_get_constraintdef(tc.oid, true) AS definition,
        fns.nspname AS foreign_table_schema,
        fc.relname AS foreign_table_name,
        COALESCE(
          ARRAY(
            SELECT a.attname
            FROM unnest(tc.confkey) WITH ORDINALITY AS k(attnum, ord)
            JOIN pg_attribute a ON a.attrelid = tc.confrelid AND a.attnum = k.attnum
            ORDER BY k.ord
          ),
          ARRAY[]::text[]
        ) AS foreign_column_names,
        CASE WHEN tc.contype = 'c'
          THEN pg_get_constraintdef(tc.oid, true)
          ELSE NULL
        END AS check_clause
      FROM pg_constraint tc
      JOIN pg_namespace ns ON ns.oid = tc.connamespace
      LEFT JOIN pg_class fc ON fc.oid = tc.confrelid
      LEFT JOIN pg_namespace fns ON fns.oid = fc.relnamespace
      WHERE ns.nspname = $1
        AND tc.conrelid = (
          SELECT c.oid FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = $1 AND c.relname = $2
        )
      ORDER BY
        CASE tc.contype
          WHEN 'p' THEN 1
          WHEN 'f' THEN 2
          WHEN 'u' THEN 3
          WHEN 'c' THEN 4
          WHEN 'x' THEN 5
          ELSE 6
        END,
        tc.conname`,
      [params.schema, params.table],
    );

    return result.rows.map((row) => ({
      name: row.constraint_name,
      type: row.constraint_type as ConstraintInfo["type"],
      columns: ensureArray(row.column_names),
      definition: row.definition,
      foreignTable: row.foreign_table_name
        ? `${row.foreign_table_schema}.${row.foreign_table_name}`
        : null,
      foreignColumns: ensureArray(row.foreign_column_names),
      checkClause: row.check_clause,
    }));
  });
}