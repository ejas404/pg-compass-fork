import { ipcMain } from 'electron';
import { Client } from 'pg';
import { ConnectionChannels } from '../shared/types/connection';
import type {
  ConnectionConfig,
  ConnectionInput,
  DatabaseSchema,
  SchemaTreeOptions,
  TableStats,
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

interface PgTableStatsRow {
  schema_name: string;
  table_name: string;
  estimated_row_count: number | string | null;
  size_on_disk: string | null;
}

function parseEstimatedRowCount(value: number | string | null): number | null {
  if (value == null) {
    return null;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.max(0, Math.round(parsed));
}

interface PgSchemaRow {
  schema_name: string;
}

function getSchemaFilterSql(
  includeInternalSchemas: boolean,
  column: string,
): string {
  if (includeInternalSchemas) {
    return '';
  }

  return `
      AND ${column} NOT IN ('pg_catalog', 'information_schema')
      AND ${column} NOT LIKE 'pg_toast%'
      AND ${column} NOT LIKE 'pg_temp%'
    `;
}

async function getSchemaTree(
  connection: ConnectionConfig,
  options?: SchemaTreeOptions,
): Promise<DatabaseSchema[]> {
  const pgConfig = buildPgConfig(connection);
  const client = new Client(pgConfig);
  const includeInternalSchemas = options?.includeInternalSchemas ?? false;

  try {
    await client.connect();

    const schemaFilterSql = getSchemaFilterSql(
      includeInternalSchemas,
      'schema_name',
    );
    const tableFilterSql = getSchemaFilterSql(
      includeInternalSchemas,
      'schemaname',
    );

    const schemaResult = await client.query<PgSchemaRow>(`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE 1 = 1
      ${schemaFilterSql}
      ORDER BY schema_name
    `);

    const result = await client.query<PgTableRow>(`
      SELECT
        schemaname AS schema_name,
        tablename AS table_name
      FROM pg_tables
      WHERE 1 = 1
      ${tableFilterSql}
      ORDER BY schemaname, tablename
    `);

    const statsResult = await client.query<PgTableStatsRow>(`
      SELECT
        n.nspname AS schema_name,
        c.relname AS table_name,
        CASE
          WHEN c.reltuples < 0 THEN NULL
          ELSE c.reltuples::bigint
        END AS estimated_row_count,
        pg_size_pretty(pg_total_relation_size(c.oid)) AS size_on_disk
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind IN ('r', 'p')
      ${getSchemaFilterSql(includeInternalSchemas, 'n.nspname')}
      ORDER BY n.nspname, c.relname
    `);

    const schemaMap = new Map<string, string[]>(
      schemaResult.rows.map((row) => [row.schema_name, []]),
    );
    const statsMap = new Map<string, Record<string, TableStats>>();

    for (const row of statsResult.rows) {
      const schemaStats = statsMap.get(row.schema_name) ?? {};
      schemaStats[row.table_name] = {
        estimatedRowCount: parseEstimatedRowCount(row.estimated_row_count),
        sizeOnDisk: row.size_on_disk,
      };
      statsMap.set(row.schema_name, schemaStats);
    }

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
      tableStats: statsMap.get(name) ?? {},
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

  ipcMain.handle(
    ConnectionChannels.GET_SCHEMA_TREE,
    async (_event, id: string, options?: SchemaTreeOptions) => {
    try {
      const connection = getConnectionById(id);
      if (!connection) return { success: false, error: 'Connection not found.' };

      const schemas = await getSchemaTree(connection, options);
      return { success: true, data: schemas };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
    },
  );
}
