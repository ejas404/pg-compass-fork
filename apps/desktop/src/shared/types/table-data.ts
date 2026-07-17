/** Types for table/view data queries used across main, preload, and renderer. */

/**
 * Reference to the parent of a single-column foreign key. Used by the
 * renderer to swap the column's editor for an FK combobox. Composite FKs
 * are intentionally not represented here in v1 — those columns fall back
 * to the plain type editor.
 */
export interface ForeignKeyRef {
  /** Parent (referenced) schema. */
  schema: string;
  /** Parent (referenced) table. */
  table: string;
  /** Parent column whose value this FK stores (the PK column on the parent). */
  column: string;
  /**
   * Heuristically-picked human-readable column on the parent table, or `null`
   * when no good label could be found. The dropdown shows the label · value
   * when set, and just the value when null.
   */
  labelColumn: string | null;
  /**
   * pg type name to cast the value to in the eventual UPDATE. Mirrors the
   * source column's `dataType`; surfaced here so the FK editor can construct
   * a valid `EditResult` without re-deriving it.
   */
  valuePgCast: string;
}

/** Column metadata returned alongside query results. */
export interface ColumnInfo {
  name: string;
  /** PostgreSQL internal type name (e.g. 'int4', 'text', 'jsonb'). */
  dataTypeId: number;
  /** PostgreSQL type name resolved from OID. */
  dataType: string;
  /**
   * Whether the source relation declares the column nullable. Present for
   * table/view data loaded through `getRows`; absent for ad-hoc query results
   * where there is no single catalog column to inspect.
   */
  isNullable?: boolean;
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
  /**
   * Single-column foreign-key reference, when this column is one. Drives
   * the searchable FK dropdown in the cell / row editor. Absent for
   * non-FK columns and for columns participating only in composite FKs.
   */
  foreignKey?: ForeignKeyRef;
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
  type: "PRIMARY KEY" | "FOREIGN KEY" | "UNIQUE" | "CHECK" | "EXCLUDE";
  columns: string[];
  definition: string | null;
  /** For foreign keys: the referenced table. */
  foreignTable: string | null;
  /** For foreign keys: the referenced columns. */
  foreignColumns: string[];
  /** For check constraints: the check expression. */
  checkClause: string | null;
}

/** Trigger info for the Triggers tab. */
export interface TriggerInfo {
  name: string;
  enabled: boolean;
  enabledMode: "ORIGIN" | "DISABLED" | "REPLICA" | "ALWAYS";
  timing: "BEFORE" | "AFTER" | "INSTEAD OF";
  events: string[];
  functionName: string;
  definition: string;
}

export type TableTypeKind = "ENUM" | "DOMAIN" | "COMPOSITE";

export interface TableTypeColumnUsage {
  name: string;
  isArray: boolean;
}

export interface CompositeTypeAttribute {
  name: string;
  dataType: string;
  isNullable: boolean;
}

/** User-defined type info for the Types tab. */
export interface TableTypeInfo {
  name: string;
  schema: string;
  kind: TableTypeKind;
  usedByColumns: TableTypeColumnUsage[];
  enumLabels: string[];
  domainBaseType: string | null;
  domainDefault: string | null;
  domainConstraints: string[];
  compositeAttributes: CompositeTypeAttribute[];
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
  /** Renderer-generated identifier used to cancel only this invocation. */
  queryId: string;
  sql: string;
  page: number;
  pageSize: number;
}

/** Parameters for cancelling one renderer-initiated query. */
export interface CancelQueryParams {
  connectionId: string;
  queryId: string;
}

export interface CancelQueryResult {
  status: "cancel-requested" | "already-finished";
}

/** Parameters for fetching table metadata (structure, indexes, constraints). */
export interface TableMetaParams {
  connectionId: string;
  schema: string;
  table: string;
}

/** Parameters for enabling or disabling a table trigger. */
export interface ToggleTriggerParams extends TableMetaParams {
  trigger: string;
  enabled: boolean;
}

/** Parameters for exporting table data as CSV or JSON. */
export interface ExportDataParams {
  connectionId: string;
  format: "csv" | "json";
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

/**
 * One column-level change inside a multi-field row update. Mirrors the
 * shape of `UpdateCellParams` minus the row identity, which is shared
 * across all fields in the parent `UpdateRowParams`.
 */
export interface UpdateRowFieldChange {
  column: string;
  pgCast: string;
  newValue: unknown;
  setNull: boolean;
}

/**
 * Parameters for a multi-column atomic update of a single row. Every
 * change lands in one `UPDATE … SET col1=$1, col2=$2 WHERE pk…` so a
 * failure in any field rolls back all of them — partial-success is
 * impossible by construction.
 */
export interface UpdateRowParams {
  connectionId: string;
  schema: string;
  table: string;
  pkColumns: string[];
  pkValues: unknown[];
  /** Length must be ≥ 1; duplicates by `column` are rejected. */
  changes: UpdateRowFieldChange[];
}

/** Result returned after a successful row update. */
export interface UpdateRowResult {
  /** Full row after the update, re-typed through `buildTypeMap`. */
  row: Record<string, unknown>;
}

/** Parameters for deleting rows from a table using the current data filter. */
export interface DeleteRowsParams {
  connectionId: string;
  schema: string;
  table: string;
  whereClause?: string;
}

/** Result returned after deleting rows. */
export interface DeleteRowsResult {
  deletedCount: number;
}

/**
 * Parameters for searching candidate rows on the parent of a foreign key.
 * The handler is read-only and not gated by `readOnlyMode` — the user is
 * picking, not writing.
 */
export interface SearchForeignKeyParams {
  connectionId: string;
  /** Parent schema (the referenced table's schema). */
  schema: string;
  /** Parent table. */
  table: string;
  /** Parent column whose value the FK stores. */
  valueColumn: string;
  /** Heuristic display column. `null` ⇒ search over the value column only. */
  labelColumn: string | null;
  /** User search text. Empty string ⇒ first page, no filter. */
  query: string;
  /** Maximum number of options to return. The handler clamps the upper bound. */
  limit: number;
}

/** One row of the FK dropdown. */
export interface ForeignKeyOption {
  /** PK value to send back when this option is chosen. */
  value: unknown;
  /** Label-column value, or `null` when there is no label column. */
  label: string | null;
}

/** Result of a foreign-key search. */
export interface SearchForeignKeyResult {
  options: ForeignKeyOption[];
  /** True when more rows exist past `limit` (caller can prompt for refinement). */
  hasMore: boolean;
}

/** IPC channel names for table data operations. */
export const TableDataChannels = {
  GET_ROWS: "table-data:get-rows",
  GET_STRUCTURE: "table-data:get-structure",
  GET_INDEXES: "table-data:get-indexes",
  GET_CONSTRAINTS: "table-data:get-constraints",
  GET_TRIGGERS: "table-data:get-triggers",
  GET_TYPES: "table-data:get-types",
  TOGGLE_TRIGGER: "table-data:toggle-trigger",
  EXECUTE_QUERY: "table-data:execute-query",
  CANCEL_QUERY: "table-data:cancel-query",
  SHOW_SAVE_DIALOG: "table-data:show-save-dialog",
  EXPORT_DATA: "table-data:export-data",
  EXPORT_PROGRESS: "table-data:export-progress",
  SQL_DUMP: "table-data:sql-dump",
  UPDATE_CELL: "table-data:update-cell",
  UPDATE_ROW: "table-data:update-row",
  DELETE_ROWS: "table-data:delete-rows",
  SEARCH_FK: "table-data:search-fk",
} as const;
