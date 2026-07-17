import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import type { ConnectionConfig } from "@/shared/types/connection";

const seedSql = fs.readFileSync(
  path.resolve(process.cwd(), "tests/support/postgres-seed.sql"),
  "utf8",
);

function buildDatabaseUrl(baseUrl: string, databaseName: string): string {
  const nextUrl = new URL(baseUrl);
  nextUrl.pathname = `/${databaseName}`;
  return nextUrl.toString();
}

export function hasPostgresTestConfig(): boolean {
  return Boolean(
    process.env.PG_COMPASS_TEST_ADMIN_DATABASE_URL ||
    process.env.PG_COMPASS_TEST_DATABASE_URL,
  );
}

export async function createSeededDatabase(): Promise<{
  connectionUrl: string;
  cleanup: () => Promise<void>;
}> {
  const adminUrl = process.env.PG_COMPASS_TEST_ADMIN_DATABASE_URL?.trim();
  const fixedUrl = process.env.PG_COMPASS_TEST_DATABASE_URL?.trim();

  if (!adminUrl && !fixedUrl) {
    throw new Error(
      "Set PG_COMPASS_TEST_ADMIN_DATABASE_URL or PG_COMPASS_TEST_DATABASE_URL to run database-backed tests.",
    );
  }

  if (!adminUrl && fixedUrl) {
    const client = new Client({ connectionString: fixedUrl });
    await client.connect();
    await client.query(seedSql);
    await client.end();

    return {
      connectionUrl: fixedUrl,
      cleanup: async () => {
        const cleanupClient = new Client({ connectionString: fixedUrl });
        await cleanupClient.connect();
        await cleanupClient.query("DROP SCHEMA IF EXISTS app CASCADE");
        await cleanupClient.end();
      },
    };
  }

  const databaseName = `pg_compass_test_${randomUUID().replaceAll("-", "")}`;
  const connectionUrl = buildDatabaseUrl(adminUrl!, databaseName);
  const adminClient = new Client({ connectionString: adminUrl! });

  await adminClient.connect();
  await adminClient.query(`CREATE DATABASE ${databaseName}`);
  await adminClient.end();

  const seedClient = new Client({ connectionString: connectionUrl });
  await seedClient.connect();
  await seedClient.query(seedSql);
  await seedClient.end();

  return {
    connectionUrl,
    cleanup: async () => {
      const cleanupAdmin = new Client({ connectionString: adminUrl! });
      await cleanupAdmin.connect();
      await cleanupAdmin.query(
        `
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = $1
          AND pid <> pg_backend_pid()
      `,
        [databaseName],
      );
      await cleanupAdmin.query(`DROP DATABASE IF EXISTS ${databaseName}`);
      await cleanupAdmin.end();
    },
  };
}

export function buildConnectionFromUrl(
  connectionUrl: string,
  overrides: Partial<ConnectionConfig> = {},
): ConnectionConfig {
  const parsed = new URL(connectionUrl);

  return {
    id: overrides.id ?? randomUUID(),
    label: overrides.label ?? "Seeded test connection",
    favourite: overrides.favourite ?? false,
    color: overrides.color ?? "#22c55e",
    mode: "fields",
    fields: {
      host: parsed.hostname,
      port: parsed.port ? Number(parsed.port) : 5432,
      database: parsed.pathname.replace(/^\//, ""),
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
    },
    ...overrides,
  };
}
