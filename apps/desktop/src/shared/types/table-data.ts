/** Types for table/view data queries used across main, preload, and renderer. */

/** Column metadata returned alongside query results. */
export interface ColumnInfo {
  name: string;
  /** PostgreSQL internal type name (e.g. 'int4', 'text', 'jsonb'). */
  dataTypeId: number;
  /** PostgreSQL type name resolved from OID. */
  dataType: string;
}

/** Paginated row result shared by data tab and query tab. */
export interface TableRowsResult {
  columns: ColumnInfo[];
  rows: Record<string, unknown>[];
  totalCount: number;
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

/** IPC channel names for table data operations. */
export const TableDataChannels = {
  GET_ROWS: 'table-data:get-rows',
  GET_STRUCTURE: 'table-data:get-structure',
  GET_INDEXES: 'table-data:get-indexes',
  GET_CONSTRAINTS: 'table-data:get-constraints',
  EXECUTE_QUERY: 'table-data:execute-query',
} as const;
