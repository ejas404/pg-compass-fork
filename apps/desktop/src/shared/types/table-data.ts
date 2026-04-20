/** Types for table/view data queries used across main, preload, and renderer. */

/** Column metadata returned alongside query results. */
export interface ColumnInfo {
  name: string;
  /** PostgreSQL internal type name (e.g. 'int4', 'text', 'jsonb'). */
  dataTypeId: number;
  /** PostgreSQL type name resolved from OID. */
  dataType: string;
  /**
   * For user-defined enum types: the allowed labels in declaration order.
   * Absent for non-enum columns. Drives the enum dropdown in the cell editor.
   */
  enumLabels?: string[];
  /**
   * Authoritative enum cast string from the catalog, schema-qualified and
   * SQL-safe for direct interpolation (e.g. `"app"."user_role"` or
   * `"App"."Role"`). Absent for non-enum columns.
   */
  enumPgCast?: string;
}

/** Paginated row result shared by data tab and query tab. */
export interface TableRowsResult {
  columns: ColumnInfo[];
  rows: Record<string, unknown>[];
  totalCount: number;
  /**
   * Primary-key column names for the source relation, in declaration order.
   * `null` when the relation has no primary key (e.g. a view, or a table
   * without PRIMARY KEY), or when the result is not from a single table
   * (e.g. an ad-hoc query). Cells are only editable when this is non-null.
   */
  primaryKey: string[] | null;
}

/** Column structure for the Structure tab. */
export interface ColumnStructure {
  name: string;
  dataType: string;
  udtName: string;
  isNullable: boolean;
  columnDefault: string | null;
  ordinalPosition: number;
  characterMaxLength: number | null;
  numericPrecision: number | null;
  numericScale: number | null;
  sampleValues: unknown[];
}

/** Index info for the Indexes tab. */
export interface IndexInfo {
  name: string;
  definition: string;
  type: string;
  size: string;
  scans: number;
  tuplesRead: number;
  tuplesFetched: number;
  isUnique: boolean;
  isPrimary: boolean;
}

/** Constraint info for the Constraints tab. */
export interface ConstraintInfo {
  name: string;
  type: 'PRIMARY KEY' | 'FOREIGN KEY' | 'UNIQUE' | 'CHECK' | 'EXCLUDE';
  columns: string[];
  definition: string | null;
  /** For foreign keys: the referenced table. */
  foreignTable: string | null;
  /** For foreign keys: the referenced columns. */
  foreignColumns: string[];
  /** For check constraints: the check expression. */
  checkClause: string | null;
}

/** Parameters for fetching paginated table rows. */
export interface GetRowsParams {
  connectionId: string;
  schema: string;
  table: string;
  page: number;
  pageSize: number;
  whereClause?: string;
}

/** Parameters for executing a read-only query. */
export interface ExecuteQueryParams {
  connectionId: string;
  sql: string;
  page: number;
  pageSize: number;
}

/** Parameters for fetching table metadata (structure, indexes, constraints). */
export interface TableMetaParams {
  connectionId: string;
  schema: string;
  table: string;
}

/** Parameters for exporting table data as CSV or JSON. */
export interface ExportDataParams {
  connectionId: string;
  format: 'csv' | 'json';
  /** Destination file path (from a prior save dialog). */
  filePath: string;
  /** Full table export: schema + table. Omit sql. */
  schema?: string;
  table?: string;
  /** Query-based export: the SQL to run. Omit schema + table. */
  sql?: string;
}

/** Result returned after a successful data export. */
export interface ExportResult {
  filePath: string;
  rowCount: number;
}

/** Parameters for an SQL COPY-based dump. */
export interface SqlDumpParams {
  connectionId: string;
  schema: string;
  table: string;
  /** Destination file path (from a prior save dialog). */
  filePath: string;
}

/** Options for the native save-file dialog. */
export interface SaveDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: { name: string; extensions: string[] }[];
}

/**
 * Parameters for updating a single cell in a single row.
 *
 * The renderer validates the value before sending, but the main process is
 * authoritative: it re-checks read-only mode, rejects unknown casts, and lets
 * Postgres surface constraint errors.
 */
export interface UpdateCellParams {
  connectionId: string;
  schema: string;
  table: string;
  /** Primary-key column names, matching `TableRowsResult.primaryKey`. */
  pkColumns: string[];
  /** Primary-key values in the same order as `pkColumns`. */
  pkValues: unknown[];
  /** The column to update. */
  column: string;
  /**
   * Postgres type name used as an explicit cast (e.g. `jsonb`, `int4`,
   * `geometry`). Must be on the `safePgCast` allowlist. Ignored when
   * `setNull` is true.
   */
  pgCast: string;
  /** The new value (JS-side; `pg` parameterises it). Ignored when `setNull`. */
  newValue: unknown;
  /** When true, SET col = NULL instead of using `newValue`. */
  setNull: boolean;
}

/** Result returned after a successful cell update. */
export interface UpdateCellResult {
  /** Full row after the update, re-typed through `buildTypeMap`. */
  row: Record<string, unknown>;
}

/** IPC channel names for table data operations. */
export const TableDataChannels = {
  GET_ROWS: 'table-data:get-rows',
  GET_STRUCTURE: 'table-data:get-structure',
  GET_INDEXES: 'table-data:get-indexes',
  GET_CONSTRAINTS: 'table-data:get-constraints',
  EXECUTE_QUERY: 'table-data:execute-query',
  SHOW_SAVE_DIALOG: 'table-data:show-save-dialog',
  EXPORT_DATA: 'table-data:export-data',
  EXPORT_PROGRESS: 'table-data:export-progress',
  SQL_DUMP: 'table-data:sql-dump',
  UPDATE_CELL: 'table-data:update-cell',
} as const;
