import { Pool } from "pg";
import type { PoolClient } from "pg";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { ConnectionConfig } from "../shared/types/connection";
import { getConnectionById } from "./connection-store";

// ---------------------------------------------------------------------------
// Connection config
// ---------------------------------------------------------------------------

/** Build a pg connection config from a ConnectionConfig. */
export function buildPgConfig(connection: ConnectionConfig) {
  const config: Record<string, unknown> =
    connection.mode === "uri" && connection.uri
      ? { connectionString: connection.uri }
      : buildFieldPgConfig(connection);

  if (connection.ssl?.enabled) {
    config.ssl = buildPgSslConfig(connection);
  }

  return config;
}

function buildFieldPgConfig(
  connection: ConnectionConfig,
): Record<string, unknown> {
  const fields = connection.fields;
  if (!fields)
    throw new Error('Connection fields are required when mode is "fields".');

  return {
    host: fields.host,
    port: fields.port,
    database: fields.database,
    user: fields.user,
    password: fields.password,
  };
}

function buildPgSslConfig(
  connection: ConnectionConfig,
): Record<string, unknown> {
  const ssl = connection.ssl;
  if (!ssl?.enabled) return {};

  return {
    rejectUnauthorized: ssl.rejectUnauthorized ?? true,
    ...(ssl.ca ? { ca: readConnectionFile(ssl.ca, "SSL CA certificate") } : {}),
    ...(ssl.cert
      ? { cert: readConnectionFile(ssl.cert, "SSL client certificate") }
      : {}),
    ...(ssl.key ? { key: readConnectionFile(ssl.key, "SSL client key") } : {}),
  };
}

function readConnectionFile(filePath: string, label: string): string {
  const resolvedPath = resolveUserPath(filePath.trim());
  try {
    return fs.readFileSync(resolvedPath, "utf8");
  } catch (err) {
    const message = (err as Error).message;
    throw new Error(
      `Could not read ${label} file at "${filePath}": ${message}`,
    );
  }
}

function resolveUserPath(filePath: string): string {
  if (filePath === "~") {
    return os.homedir();
  }

  if (filePath.startsWith(`~${path.sep}`) || filePath.startsWith("~/")) {
    return path.join(os.homedir(), filePath.slice(2));
  }

  return filePath;
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
  if (!connection) throw new Error("Connection not found.");

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
  if (!pool) return;
  pools.delete(connectionId);
  try {
    await pool.end();
  } catch (err) {
    console.error(`[pg-utils] destroyPool(${connectionId}) failed:`, err);
  }
}

/** Destroy all connection pools (e.g. on app quit). */
export async function destroyAllPools(): Promise<void> {
  const entries = Array.from(pools.entries());
  pools.clear();
  await Promise.all(
    entries.map(async ([id, pool]) => {
      try {
        await pool.end();
      } catch (err) {
        console.error(`[pg-utils] destroyAllPools: pool ${id} failed:`, err);
      }
    }),
  );
}
