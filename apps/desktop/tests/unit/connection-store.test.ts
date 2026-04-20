import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTempDir } from "../support/store";

vi.mock("electron", () => ({
  safeStorage: {
    isEncryptionAvailable: () => false,
    encryptString: vi.fn(),
    decryptString: vi.fn(),
  },
}));

describe("connection-store", () => {
  beforeEach(() => {
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
});
