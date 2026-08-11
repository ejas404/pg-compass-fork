import type {
  ConnectionConfig,
  ConnectionFileDialogOptions,
  ConnectionInput,
  DatabaseSchema,
  SchemaTreeOptions,
} from "./connection";
import type { AppSettings, AppSettingsPatch } from "./settings";
import type {
  CancelQueryParams,
  CancelQueryResult,
  ColumnStructure,
  ConstraintInfo,
  DeleteRowsParams,
  DeleteRowsResult,
  ExecuteQueryParams,
  ExportDataParams,
  ExportResult,
  GetRowsParams,
  ImportDataParams,
  ImportProgress,
  ImportResult,
  IndexInfo,
  InsertRowParams,
  InsertRowResult,
  OpenDialogOptions,
  SaveDialogOptions,
  SearchForeignKeyParams,
  SearchForeignKeyResult,
  SqlDumpParams,
  TableMetaParams,
  TableRowsResult,
  TableTypeInfo,
  ToggleTriggerParams,
  TriggerInfo,
  UpdateCellParams,
  UpdateCellResult,
  UpdateRowParams,
  UpdateRowResult,
} from "./table-data";

export type IpcResult<T> =
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: string };

export interface ConnectionApi {
  getAll(): Promise<IpcResult<ConnectionConfig[]>>;
  getById(id: string): Promise<IpcResult<ConnectionConfig>>;
  create(input: ConnectionInput): Promise<IpcResult<ConnectionConfig>>;
  update(
    id: string,
    input: ConnectionInput,
  ): Promise<IpcResult<ConnectionConfig>>;
  delete(id: string): Promise<IpcResult<boolean>>;
  toggleFavourite(id: string): Promise<IpcResult<ConnectionConfig>>;
  test(id: string): Promise<IpcResult<boolean>>;
  getSchemaTree(
    id: string,
    options?: SchemaTreeOptions,
  ): Promise<IpcResult<DatabaseSchema[]>>;
  showOpenFileDialog(
    options: ConnectionFileDialogOptions,
  ): Promise<IpcResult<string | null>>;
}

export interface SettingsApi {
  get(): Promise<IpcResult<AppSettings>>;
  update(patch: AppSettingsPatch): Promise<IpcResult<AppSettings>>;
}

export interface TableDataApi {
  getRows(params: GetRowsParams): Promise<IpcResult<TableRowsResult>>;
  getStructure(params: TableMetaParams): Promise<IpcResult<ColumnStructure[]>>;
  getIndexes(params: TableMetaParams): Promise<IpcResult<IndexInfo[]>>;
  getConstraints(params: TableMetaParams): Promise<IpcResult<ConstraintInfo[]>>;
  getTriggers(params: TableMetaParams): Promise<IpcResult<TriggerInfo[]>>;
  getTypes(params: TableMetaParams): Promise<IpcResult<TableTypeInfo[]>>;
  toggleTrigger(params: ToggleTriggerParams): Promise<IpcResult<TriggerInfo[]>>;
  executeQuery(params: ExecuteQueryParams): Promise<IpcResult<TableRowsResult>>;
  cancelQuery(params: CancelQueryParams): Promise<IpcResult<CancelQueryResult>>;
  showSaveDialog(options: SaveDialogOptions): Promise<IpcResult<string | null>>;
  showOpenDialog(options: OpenDialogOptions): Promise<IpcResult<string | null>>;
  exportData(params: ExportDataParams): Promise<IpcResult<ExportResult>>;
  sqlDump(params: SqlDumpParams): Promise<IpcResult<ExportResult>>;
  importData(params: ImportDataParams): Promise<IpcResult<ImportResult>>;
  insertRow(params: InsertRowParams): Promise<IpcResult<InsertRowResult>>;
  updateCell(params: UpdateCellParams): Promise<IpcResult<UpdateCellResult>>;
  updateRow(params: UpdateRowParams): Promise<IpcResult<UpdateRowResult>>;
  deleteRows(params: DeleteRowsParams): Promise<IpcResult<DeleteRowsResult>>;
  searchForeignKey(
    params: SearchForeignKeyParams,
  ): Promise<IpcResult<SearchForeignKeyResult>>;
  onExportProgress(callback: (rowCount: number) => void): () => void;
  onImportProgress(callback: (progress: ImportProgress) => void): () => void;
}

export interface HelpApi {
  onShowLicense(callback: () => void): () => void;
  onShowAbout(callback: () => void): () => void;
  onShowShortcuts(callback: () => void): () => void;
}

export interface WorkspaceApi {
  onCloseTab(callback: () => void): () => void;
  onNextTab(callback: () => void): () => void;
  onPrevTab(callback: () => void): () => void;
}

export interface ClipboardApi {
  writeText(text: string): Promise<IpcResult<void>>;
}
