// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';
import { ConnectionChannels } from './shared/types/connection';
import { SettingsChannels } from './shared/types/settings';
import { TableDataChannels } from './shared/types/table-data';
import type {
  ConnectionConfig,
  ConnectionInput,
  DatabaseSchema,
  SchemaTreeOptions,
} from './shared/types/connection';
import type {
  AppSettings,
  AppSettingsPatch,
} from './shared/types/settings';
import type {
  ColumnStructure,
  ConstraintInfo,
  ExecuteQueryParams,
  GetRowsParams,
  IndexInfo,
  TableMetaParams,
  TableRowsResult,
} from './shared/types/table-data';

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

  update: (id: string, input: ConnectionInput): Promise<IpcResult<ConnectionConfig>> =>
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

  getStructure: (params: TableMetaParams): Promise<IpcResult<ColumnStructure[]>> =>
    ipcRenderer.invoke(TableDataChannels.GET_STRUCTURE, params),

  getIndexes: (params: TableMetaParams): Promise<IpcResult<IndexInfo[]>> =>
    ipcRenderer.invoke(TableDataChannels.GET_INDEXES, params),

  getConstraints: (params: TableMetaParams): Promise<IpcResult<ConstraintInfo[]>> =>
    ipcRenderer.invoke(TableDataChannels.GET_CONSTRAINTS, params),

  executeQuery: (params: ExecuteQueryParams): Promise<IpcResult<TableRowsResult>> =>
    ipcRenderer.invoke(TableDataChannels.EXECUTE_QUERY, params),
};

contextBridge.exposeInMainWorld('connectionApi', connectionApi);
contextBridge.exposeInMainWorld('settingsApi', settingsApi);
contextBridge.exposeInMainWorld('tableDataApi', tableDataApi);
