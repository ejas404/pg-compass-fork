import { ipcMain } from 'electron';
import { Client } from 'pg';
import { ConnectionChannels } from '../shared/types/connection';
import type {
  ConnectionConfig,
  ConnectionInput,
  DatabaseSchema,
} from '../shared/types/connection';
import {
  getAllConnections,
  getConnectionById,
  createConnection,
  updateConnection,
  deleteConnection,
  toggleFavourite,
} from './connection-store';

/** Build a pg Client config from a ConnectionConfig. */
function buildPgConfig(connection: ConnectionConfig) {
  if (connection.mode === 'uri' && connection.uri) {
    return { connectionString: connection.uri };
  }

  const fields = connection.fields;
  if (!fields) throw new Error('Connection fields are required when mode is "fields".');

  const config: Record<string, unknown> = {
    host: fields.host,
    port: fields.port,
    database: fields.database,
    user: fields.user,
    password: fields.password,
  };

  if (connection.ssl?.enabled) {
    config.ssl = {
      rejectUnauthorized: connection.ssl.rejectUnauthorized ?? true,
      ...(connection.ssl.ca ? { ca: connection.ssl.ca } : {}),
      ...(connection.ssl.cert ? { cert: connection.ssl.cert } : {}),
      ...(connection.ssl.key ? { key: connection.ssl.key } : {}),
    };
  }

  return config;
}

interface PgTableRow {
  schema_name: string;
  table_name: string;
}

interface PgSchemaRow {
  schema_name: string;
}

async function getSchemaTree(connection: ConnectionConfig): Promise<DatabaseSchema[]> {
  const pgConfig = buildPgConfig(connection);
  const client = new Client(pgConfig);

  try {
    await client.connect();

    const schemaResult = await client.query<PgSchemaRow>(`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name NOT IN ('pg_catalog', 'information_schema')
        AND schema_name NOT LIKE 'pg_toast%'
      ORDER BY schema_name
    `);

    const result = await client.query<PgTableRow>(`
      SELECT
        schemaname AS schema_name,
        tablename AS table_name
      FROM pg_tables
      WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
        AND schemaname NOT LIKE 'pg_toast%'
      ORDER BY schemaname, tablename
    `);

    const schemaMap = new Map<string, string[]>(
      schemaResult.rows.map((row) => [row.schema_name, []]),
    );

    for (const row of result.rows) {
      const tables = schemaMap.get(row.schema_name);
      if (tables) {
        tables.push(row.table_name);
      } else {
        schemaMap.set(row.schema_name, [row.table_name]);
      }
    }

    return Array.from(schemaMap.entries()).map(([name, tables]) => ({
      name,
      tables,
    }));
  } finally {
    try {
      await client.end();
    } catch {
      // Ignore client shutdown errors so the original query error is preserved.
    }
  }
}

/** Register all connection-related IPC handlers. */
export function registerConnectionHandlers(): void {
  ipcMain.handle(ConnectionChannels.GET_ALL, () => {
    try {
      return { success: true, data: getAllConnections() };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(ConnectionChannels.GET_BY_ID, (_event, id: string) => {
    try {
      const connection = getConnectionById(id);
      if (!connection) return { success: false, error: 'Connection not found.' };
      return { success: true, data: connection };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(ConnectionChannels.CREATE, (_event, input: ConnectionInput) => {
    try {
      const connection = createConnection(input);
      return { success: true, data: connection };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(ConnectionChannels.UPDATE, (_event, id: string, input: ConnectionInput) => {
    try {
      const connection = updateConnection(id, input);
      if (!connection) return { success: false, error: 'Connection not found.' };
      return { success: true, data: connection };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(ConnectionChannels.DELETE, (_event, id: string) => {
    try {
      const deleted = deleteConnection(id);
      if (!deleted) return { success: false, error: 'Connection not found.' };
      return { success: true, data: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(ConnectionChannels.TOGGLE_FAVOURITE, (_event, id: string) => {
    try {
      const connection = toggleFavourite(id);
      if (!connection) return { success: false, error: 'Connection not found.' };
      return { success: true, data: connection };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(ConnectionChannels.TEST, async (_event, id: string) => {
    try {
      const connection = getConnectionById(id);
      if (!connection) return { success: false, error: 'Connection not found.' };

      const pgConfig = buildPgConfig(connection);
      const client = new Client(pgConfig);

      await client.connect();
      await client.query('SELECT 1');
      await client.end();

      return { success: true, data: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(ConnectionChannels.GET_SCHEMA_TREE, async (_event, id: string) => {
    try {
      const connection = getConnectionById(id);
      if (!connection) return { success: false, error: 'Connection not found.' };

      const schemas = await getSchemaTree(connection);
      return { success: true, data: schemas };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });
}
