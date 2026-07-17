// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from "electron";
import { ConnectionChannels } from "./shared/types/connection";
import { SettingsChannels } from "./shared/types/settings";
import { TableDataChannels } from "./shared/types/table-data";
import { HelpChannels } from "./shared/constants/help";
import { WorkspaceChannels } from "./shared/constants/workspace";
import { ClipboardChannels } from "./shared/constants/clipboard";
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

/** IPC result wrapper. */
export interface IpcResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const connectionApi = {
  getAll: (): Promise<IpcResult<ConnectionConfig[]>> =>
    ipcRenderer.invoke(ConnectionChannels.GET_ALL),

  getById: (id: string): Promise<IpcResult<ConnectionConfig>> =>
    ipcRenderer.invoke(ConnectionChannels.GET_BY_ID, id),

  create: (input: ConnectionInput): Promise<IpcResult<ConnectionConfig>> =>
    ipcRenderer.invoke(ConnectionChannels.CREATE, input),

  update: (
    id: string,
    input: ConnectionInput,
  ): Promise<IpcResult<ConnectionConfig>> =>
    ipcRenderer.invoke(ConnectionChannels.UPDATE, id, input),

  delete: (id: string): Promise<IpcResult<boolean>> =>
    ipcRenderer.invoke(ConnectionChannels.DELETE, id),

  toggleFavourite: (id: string): Promise<IpcResult<ConnectionConfig>> =>
    ipcRenderer.invoke(ConnectionChannels.TOGGLE_FAVOURITE, id),

  test: (id: string): Promise<IpcResult<boolean>> =>
    ipcRenderer.invoke(ConnectionChannels.TEST, id),

  getSchemaTree: (
    id: string,
    options?: SchemaTreeOptions,
  ): Promise<IpcResult<DatabaseSchema[]>> =>
    ipcRenderer.invoke(ConnectionChannels.GET_SCHEMA_TREE, id, options),

  showOpenFileDialog: (
    options: ConnectionFileDialogOptions,
  ): Promise<IpcResult<string | null>> =>
    ipcRenderer.invoke(ConnectionChannels.SHOW_OPEN_FILE_DIALOG, options),
};

const settingsApi = {
  get: (): Promise<IpcResult<AppSettings>> =>
    ipcRenderer.invoke(SettingsChannels.GET),

  update: (patch: AppSettingsPatch): Promise<IpcResult<AppSettings>> =>
    ipcRenderer.invoke(SettingsChannels.UPDATE, patch),
};

const tableDataApi = {
  getRows: (params: GetRowsParams): Promise<IpcResult<TableRowsResult>> =>
    ipcRenderer.invoke(TableDataChannels.GET_ROWS, params),

  getStructure: (
    params: TableMetaParams,
  ): Promise<IpcResult<ColumnStructure[]>> =>
    ipcRenderer.invoke(TableDataChannels.GET_STRUCTURE, params),

  getIndexes: (params: TableMetaParams): Promise<IpcResult<IndexInfo[]>> =>
    ipcRenderer.invoke(TableDataChannels.GET_INDEXES, params),

  getConstraints: (
    params: TableMetaParams,
  ): Promise<IpcResult<ConstraintInfo[]>> =>
    ipcRenderer.invoke(TableDataChannels.GET_CONSTRAINTS, params),

  getTriggers: (params: TableMetaParams): Promise<IpcResult<TriggerInfo[]>> =>
    ipcRenderer.invoke(TableDataChannels.GET_TRIGGERS, params),

  getTypes: (params: TableMetaParams): Promise<IpcResult<TableTypeInfo[]>> =>
    ipcRenderer.invoke(TableDataChannels.GET_TYPES, params),

  toggleTrigger: (
    params: ToggleTriggerParams,
  ): Promise<IpcResult<TriggerInfo[]>> =>
    ipcRenderer.invoke(TableDataChannels.TOGGLE_TRIGGER, params),

  executeQuery: (
    params: ExecuteQueryParams,
  ): Promise<IpcResult<TableRowsResult>> =>
    ipcRenderer.invoke(TableDataChannels.EXECUTE_QUERY, params),

  cancelQuery: (
    params: CancelQueryParams,
  ): Promise<IpcResult<CancelQueryResult>> =>
    ipcRenderer.invoke(TableDataChannels.CANCEL_QUERY, params),

  showSaveDialog: (
    options: SaveDialogOptions,
  ): Promise<IpcResult<string | null>> =>
    ipcRenderer.invoke(TableDataChannels.SHOW_SAVE_DIALOG, options),

  exportData: (params: ExportDataParams): Promise<IpcResult<ExportResult>> =>
    ipcRenderer.invoke(TableDataChannels.EXPORT_DATA, params),

  sqlDump: (params: SqlDumpParams): Promise<IpcResult<ExportResult>> =>
    ipcRenderer.invoke(TableDataChannels.SQL_DUMP, params),

  updateCell: (
    params: UpdateCellParams,
  ): Promise<IpcResult<UpdateCellResult>> =>
    ipcRenderer.invoke(TableDataChannels.UPDATE_CELL, params),

  updateRow: (params: UpdateRowParams): Promise<IpcResult<UpdateRowResult>> =>
    ipcRenderer.invoke(TableDataChannels.UPDATE_ROW, params),

  deleteRows: (
    params: DeleteRowsParams,
  ): Promise<IpcResult<DeleteRowsResult>> =>
    ipcRenderer.invoke(TableDataChannels.DELETE_ROWS, params),

  searchForeignKey: (
    params: SearchForeignKeyParams,
  ): Promise<IpcResult<SearchForeignKeyResult>> =>
    ipcRenderer.invoke(TableDataChannels.SEARCH_FK, params),

  onExportProgress: (callback: (rowCount: number) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, rowCount: number) =>
      callback(rowCount);
    ipcRenderer.on(TableDataChannels.EXPORT_PROGRESS, handler);
    return () => {
      ipcRenderer.removeListener(TableDataChannels.EXPORT_PROGRESS, handler);
    };
  },
};

const helpApi = {
  onShowLicense: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on(HelpChannels.SHOW_LICENSE, listener);
    return () => {
      ipcRenderer.removeListener(HelpChannels.SHOW_LICENSE, listener);
    };
  },

  onShowAbout: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on(HelpChannels.SHOW_ABOUT, listener);
    return () => {
      ipcRenderer.removeListener(HelpChannels.SHOW_ABOUT, listener);
    };
  },

  onShowShortcuts: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on(HelpChannels.SHOW_SHORTCUTS, listener);
    return () => {
      ipcRenderer.removeListener(HelpChannels.SHOW_SHORTCUTS, listener);
    };
  },
};

const workspaceApi = {
  onCloseTab: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on(WorkspaceChannels.CLOSE_TAB, listener);
    return () => {
      ipcRenderer.removeListener(WorkspaceChannels.CLOSE_TAB, listener);
    };
  },

  onNextTab: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on(WorkspaceChannels.NEXT_TAB, listener);
    return () => {
      ipcRenderer.removeListener(WorkspaceChannels.NEXT_TAB, listener);
    };
  },

  onPrevTab: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on(WorkspaceChannels.PREV_TAB, listener);
    return () => {
      ipcRenderer.removeListener(WorkspaceChannels.PREV_TAB, listener);
    };
  },
};

const clipboardApi = {
  writeText: (text: string): Promise<IpcResult<void>> =>
    ipcRenderer.invoke(ClipboardChannels.WRITE_TEXT, text),
};

contextBridge.exposeInMainWorld("connectionApi", connectionApi);
contextBridge.exposeInMainWorld("settingsApi", settingsApi);
contextBridge.exposeInMainWorld("tableDataApi", tableDataApi);
contextBridge.exposeInMainWorld("helpApi", helpApi);
contextBridge.exposeInMainWorld("workspaceApi", workspaceApi);
contextBridge.exposeInMainWorld("clipboardApi", clipboardApi);
