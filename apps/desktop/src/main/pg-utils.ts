import { Pool } from 'pg';
import type { PoolClient } from 'pg';
import type { ConnectionConfig } from '../shared/types/connection';
import { getConnectionById } from './connection-store';

// ---------------------------------------------------------------------------
// Connection config
// ---------------------------------------------------------------------------

/** Build a pg connection config from a ConnectionConfig. */
export function buildPgConfig(connection: ConnectionConfig) {
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

/** Quote a PostgreSQL identifier to prevent SQL injection. */
export function quoteIdent(name: string): string {
  return `"${name.replaceAll('"', '""')}"`;
}

// ---------------------------------------------------------------------------
// Connection pooling
// ---------------------------------------------------------------------------

const pools = new Map<string, Pool>();

/** Get or create a connection pool for a given connection ID. */
function getOrCreatePool(connectionId: string): Pool {
  let pool = pools.get(connectionId);
  if (pool) return pool;

  const connection = getConnectionById(connectionId);
  if (!connection) throw new Error('Connection not found.');

  pool = new Pool({ ...buildPgConfig(connection), max: 5 });
  pools.set(connectionId, pool);
  return pool;
}

/** Run a function with a pooled client, automatically releasing it afterwards. */
export async function withPoolClient<T>(
  connectionId: string,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const pool = getOrCreatePool(connectionId);
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

/** Destroy the pool for a specific connection (e.g. after config change or deletion). */
export async function destroyPool(connectionId: string): Promise<void> {
  const pool = pools.get(connectionId);
  if (pool) {
    pools.delete(connectionId);
    await pool.end().catch(() => {});
  }
}

/** Destroy all connection pools (e.g. on app quit). */
export async function destroyAllPools(): Promise<void> {
  const endPromises = Array.from(pools.values()).map((pool) =>
    pool.end().catch(() => {}),
  );
  pools.clear();
  await Promise.all(endPromises);
}
