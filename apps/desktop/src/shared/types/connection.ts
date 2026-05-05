/** Shared connection types used across main, preload, and renderer processes. */

export interface ConnectionConfig {
  /** Unique identifier for the connection. */
  id: string;
  /** User-friendly label for the connection. */
  label: string;
  /** Optional accent color (hex string) for visual identification. */
  color?: string;
  /** Whether this connection is marked as a favourite. */
  favourite: boolean;
  /** Connection mode: URI string or individual fields. */
  mode: "uri" | "fields";
  /** PostgreSQL connection URI (when mode is 'uri'). */
  uri?: string;
  /** Individual connection fields (when mode is 'fields'). */
  fields?: ConnectionFields;
  /** SSL configuration. */
  ssl?: SSLConfig;
  /** SSH tunnel configuration. */
  ssh?: SSHConfig;
}

export interface ConnectionFields {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

export interface SSLConfig {
  enabled: boolean;
  /** Reject unauthorized certificates. Defaults to true. */
  rejectUnauthorized?: boolean;
  /** Path to CA certificate file. */
  ca?: string;
  /** Path to client certificate file. */
  cert?: string;
  /** Path to client key file. */
  key?: string;
}

export interface ConnectionFileDialogOptions {
  title: string;
  defaultPath?: string;
  filters?: Array<{
    name: string;
    extensions: string[];
  }>;
}

export interface SSHConfig {
  enabled: boolean;
  host: string;
  port: number;
  user: string;
  /** Authentication method. */
  authMethod: "password" | "privateKey";
  password?: string;
  privateKeyPath?: string;
  passphrase?: string;
}

/** Shape of data sent when creating or updating a connection. */
export type ConnectionInput = Omit<ConnectionConfig, "id">;

/** Schema node for sidebar tree view. */
export interface TableStats {
  estimatedRowCount: number | null;
  sizeOnDisk: string | null;
}

export interface DatabaseView {
  name: string;
  definition: string | null;
}

export interface DatabaseSchema {
  name: string;
  tables: string[];
  views: DatabaseView[];
  tableStats?: Record<string, TableStats>;
}

export interface SchemaTreeOptions {
  includeInternalSchemas?: boolean;
}

/** IPC channel names for connection management. */
export const ConnectionChannels = {
  GET_ALL: "connections:get-all",
  GET_BY_ID: "connections:get-by-id",
  CREATE: "connections:create",
  UPDATE: "connections:update",
  DELETE: "connections:delete",
  TOGGLE_FAVOURITE: "connections:toggle-favourite",
  TEST: "connections:test",
  GET_SCHEMA_TREE: "connections:get-schema-tree",
  SHOW_OPEN_FILE_DIALOG: "connections:show-open-file-dialog",
} as const;
