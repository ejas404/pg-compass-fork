import type {
  ConnectionConfig,
  ConnectionInput,
  DatabaseSchema,
} from './shared/types/connection';

export interface IpcResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface ConnectionApi {
  getAll(): Promise<IpcResult<ConnectionConfig[]>>;
  getById(id: string): Promise<IpcResult<ConnectionConfig>>;
  create(input: ConnectionInput): Promise<IpcResult<ConnectionConfig>>;
  update(id: string, input: ConnectionInput): Promise<IpcResult<ConnectionConfig>>;
  delete(id: string): Promise<IpcResult<boolean>>;
  toggleFavourite(id: string): Promise<IpcResult<ConnectionConfig>>;
  test(id: string): Promise<IpcResult<boolean>>;
  getSchemaTree(id: string): Promise<IpcResult<DatabaseSchema[]>>;
}

declare global {
  interface Window {
    connectionApi: ConnectionApi;
  }
}
