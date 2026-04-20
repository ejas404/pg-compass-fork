import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { DEFAULT_APP_SETTINGS } from "@/shared/types/settings";
import type { ConnectionConfig } from "@/shared/types/connection";

export interface SeedStoreOptions {
  connections?: ConnectionConfig[];
  settings?: typeof DEFAULT_APP_SETTINGS;
}

export function createTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

export function writeStoreFiles(
  storeDir: string,
  options: SeedStoreOptions = {},
): void {
  fs.mkdirSync(storeDir, { recursive: true });
  fs.writeFileSync(
    path.join(storeDir, "connections.json"),
    JSON.stringify({ connections: options.connections ?? [] }, null, 2),
    "utf8",
  );
  fs.writeFileSync(
    path.join(storeDir, "settings.json"),
    JSON.stringify(
      { settings: options.settings ?? DEFAULT_APP_SETTINGS },
      null,
      2,
    ),
    "utf8",
  );
}

export function buildConnectionSeed(
  overrides: Partial<ConnectionConfig> = {},
): ConnectionConfig {
  return {
    id: randomUUID(),
    label: "Local test database",
    favourite: false,
    mode: "fields",
    color: "#3b82f6",
    fields: {
      host: "localhost",
      port: 5432,
      database: "postgres",
      user: "postgres",
      password: "postgres",
    },
    ...overrides,
  };
}
