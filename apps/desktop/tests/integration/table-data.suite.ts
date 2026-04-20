import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createTempDir } from "../support/store";
import { buildConnectionFromUrl } from "../support/postgres";

vi.mock("electron", () => ({
  safeStorage: {
    isEncryptionAvailable: () => false,
    encryptString: vi.fn(),
    decryptString: vi.fn(),
  },
}));

interface SeededDatabase {
  connectionUrl: string;
  cleanup: () => Promise<void>;
}

export function runTableDataIntegrationSuite(
  label: string,
  createDatabase: () => Promise<SeededDatabase>,
) {
  describe(`main-process database modules (${label})`, () => {
    let cleanup: (() => Promise<void>) | undefined;
    let connectionId = "";

    beforeAll(async () => {
      process.env.PG_COMPASS_STORE_DIR = createTempDir(
        `pg-compass-${label}-store-`,
      );

      const seeded = await createDatabase();
      cleanup = seeded.cleanup;

      const connection = buildConnectionFromUrl(seeded.connectionUrl, {
        label: `${label} integration database`,
      });

      const { createConnection } = await import("@/main/connection-store");
      const created = createConnection({
        label: connection.label,
        favourite: connection.favourite,
        color: connection.color,
        mode: "fields",
        fields: connection.fields,
      });

      connectionId = created.id;
    });

    afterAll(async () => {
      const { destroyAllPools } = await import("@/main/pg-utils");
      await destroyAllPools();
      await cleanup?.();
    });

    it("fetches paginated rows and query results", async () => {
      const { getRows, executeQuery } = await import("@/main/table-data-rows");

      const rows = await getRows({
        connectionId,
        schema: "app",
        table: "users",
        page: 2,
        pageSize: 25,
      });
      expect(rows.totalCount).toBe(120);
      expect(rows.rows).toHaveLength(25);

      const query = await executeQuery({
        connectionId,
        sql: "SELECT id, email FROM app.users ORDER BY id LIMIT 10",
        page: 1,
        pageSize: 5,
      });
      expect(query.totalCount).toBe(10);
      expect(query.rows[0]).toMatchObject({ id: 1 });
    });

    it("fetches structure, indexes, and constraints", async () => {
      const { getStructure, getIndexes, getConstraints } = await import(
        "@/main/table-data-meta"
      );

      const structure = await getStructure({
        connectionId,
        schema: "app",
        table: "users",
      });
      expect(
        structure.find((column) => column.name === "profile")?.udtName,
      ).toBe("jsonb");

      const indexes = await getIndexes({
        connectionId,
        schema: "app",
        table: "orders",
      });
      expect(
        indexes.some((index) => index.name === "orders_user_id_idx"),
      ).toBe(true);

      const constraints = await getConstraints({
        connectionId,
        schema: "app",
        table: "orders",
      });
      expect(
        constraints.some((constraint) => constraint.type === "FOREIGN KEY"),
      ).toBe(true);
    });
  });
}
