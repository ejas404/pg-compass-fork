// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';
import { ConnectionChannels } from './shared/types/connection';
import type {
  ConnectionConfig,
  ConnectionInput,
  DatabaseSchema,
} from './shared/types/connection';

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

  getSchemaTree: (id: string): Promise<IpcResult<DatabaseSchema[]>> =>
    ipcRenderer.invoke(ConnectionChannels.GET_SCHEMA_TREE, id),
};

contextBridge.exposeInMainWorld('connectionApi', connectionApi);
