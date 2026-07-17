import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTempDir } from "../support/store";

const encryptionAvailable = vi.hoisted(() => ({ value: false }));

vi.mock("electron", () => ({
  safeStorage: {
    isEncryptionAvailable: () => encryptionAvailable.value,
    getSelectedStorageBackend: () => "dpapi",
    encryptString: (value: string) => Buffer.from(`encrypted:${value}`),
    decryptString: (value: Buffer) =>
      value.toString().replace(/^encrypted:/, ""),
  },
}));

describe("connection-store", () => {
  beforeEach(() => {
    encryptionAvailable.value = false;
    process.env.PG_COMPASS_STORE_DIR = createTempDir("pg-compass-store-");
  });

  it("creates, updates, toggles favourite, and deletes connections", async () => {
    vi.resetModules();
    const store = await import("@/main/connection-store");

    const created = store.createConnection({
      label: "Local",
      favourite: false,
      mode: "fields",
      fields: {
        host: "localhost",
        port: 5432,
        database: "postgres",
        user: "postgres",
        password: "secret",
      },
    });

    expect(store.getAllConnections()).toHaveLength(1);

    const updated = store.updateConnection(created.id, {
      ...created,
      label: "Renamed",
    });
    expect(updated?.label).toBe("Renamed");

    const toggled = store.toggleFavourite(created.id);
    expect(toggled?.favourite).toBe(true);

    expect(store.deleteConnection(created.id)).toBe(true);
    expect(store.getAllConnections()).toHaveLength(0);
  });

  it("returns decrypted credentials after encrypted writes and favourite toggles", async () => {
    encryptionAvailable.value = true;
    vi.resetModules();
    const store = await import("@/main/connection-store");

    const created = store.createConnection({
      label: "Encrypted",
      favourite: false,
      mode: "uri",
      uri: "postgresql://user:secret@localhost/database",
      ssh: {
        enabled: true,
        host: "bastion.example.com",
        port: 22,
        user: "deploy",
        authMethod: "password",
        password: "ssh-secret",
        passphrase: "key-secret",
      },
    });

    store.updateConnection(created.id, {
      ...created,
      uri: "postgresql://user:updated@localhost/database",
      ssh: {
        ...created.ssh!,
        password: "updated-ssh-secret",
        passphrase: "updated-key-secret",
      },
    });
    const toggled = store.toggleFavourite(created.id);
    expect(toggled).toMatchObject({
      uri: "postgresql://user:updated@localhost/database",
      ssh: {
        password: "updated-ssh-secret",
        passphrase: "updated-key-secret",
      },
    });
    expect(store.getConnectionById(created.id)).toMatchObject({
      uri: "postgresql://user:updated@localhost/database",
      ssh: {
        password: "updated-ssh-secret",
        passphrase: "updated-key-secret",
      },
    });

    const fieldsConnection = store.createConnection({
      label: "Fields",
      favourite: false,
      mode: "fields",
      fields: {
        host: "localhost",
        port: 5432,
        database: "postgres",
        user: "postgres",
        password: "field-secret",
      },
    });
    expect(store.getConnectionById(fieldsConnection.id)?.fields?.password).toBe(
      "field-secret",
    );
  });
});
