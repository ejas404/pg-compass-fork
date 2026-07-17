import type {
  ConnectionConfig,
  ConnectionFileDialogOptions,
  ConnectionInput,
  DatabaseSchema,
  SchemaTreeOptions,
} from "./shared/types/connection";
import type { AppSettings, AppSettingsPatch } from "./shared/types/settings";
import type {
  ColumnStructure,
  CancelQueryParams,
  CancelQueryResult,
  ConstraintInfo,
  DeleteRowsParams,
  DeleteRowsResult,
  ExportDataParams,
  ExportResult,
  ExecuteQueryParams,
  GetRowsParams,
  IndexInfo,
  SaveDialogOptions,
  SqlDumpParams,
  TableMetaParams,
  TableTypeInfo,
  TableRowsResult,
  ToggleTriggerParams,
  TriggerInfo,
  UpdateCellParams,
  UpdateCellResult,
  UpdateRowParams,
  UpdateRowResult,
  SearchForeignKeyParams,
  SearchForeignKeyResult,
} from "./shared/types/table-data";

export interface IpcResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface ConnectionApi {
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

interface SettingsApi {
  get(): Promise<IpcResult<AppSettings>>;
  update(patch: AppSettingsPatch): Promise<IpcResult<AppSettings>>;
}

interface TableDataApi {
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
  exportData(params: ExportDataParams): Promise<IpcResult<ExportResult>>;
  sqlDump(params: SqlDumpParams): Promise<IpcResult<ExportResult>>;
  updateCell(params: UpdateCellParams): Promise<IpcResult<UpdateCellResult>>;
  updateRow(params: UpdateRowParams): Promise<IpcResult<UpdateRowResult>>;
  deleteRows(params: DeleteRowsParams): Promise<IpcResult<DeleteRowsResult>>;
  searchForeignKey(
    params: SearchForeignKeyParams,
  ): Promise<IpcResult<SearchForeignKeyResult>>;
  onExportProgress(callback: (rowCount: number) => void): () => void;
}

interface HelpApi {
  onShowLicense(callback: () => void): () => void;
  onShowAbout(callback: () => void): () => void;
  onShowShortcuts(callback: () => void): () => void;
}

interface WorkspaceApi {
  onCloseTab(callback: () => void): () => void;
  onNextTab(callback: () => void): () => void;
  onPrevTab(callback: () => void): () => void;
}

interface ClipboardApi {
  writeText(text: string): Promise<IpcResult<void>>;
}

declare global {
  interface Window {
    connectionApi: ConnectionApi;
    settingsApi: SettingsApi;
    tableDataApi: TableDataApi;
    helpApi: HelpApi;
    workspaceApi: WorkspaceApi;
    clipboardApi: ClipboardApi;
  }
}
