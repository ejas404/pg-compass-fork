import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createTempDir } from "../support/store";
import { buildConnectionFromUrl } from "../support/postgres";
import { hasExtension, hasColumn } from "../support/capabilities";

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

const INJECTION_COLUMN = 'evil"col; DROP TABLE x; --';

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

    // -----------------------------------------------------------------------
    // Existing coverage (unchanged)
    // -----------------------------------------------------------------------

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
      const { getStructure, getIndexes, getConstraints } =
        await import("@/main/table-data-meta");

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
      expect(indexes.some((index) => index.name === "orders_user_id_idx")).toBe(
        true,
      );

      const constraints = await getConstraints({
        connectionId,
        schema: "app",
        table: "orders",
      });
      expect(
        constraints.some((constraint) => constraint.type === "FOREIGN KEY"),
      ).toBe(true);
    });

    // -----------------------------------------------------------------------
    // primaryKey resolution
    // -----------------------------------------------------------------------

    describe("primaryKey resolution", () => {
      it("returns the primary-key columns for a real table", async () => {
        const { getRows } = await import("@/main/table-data-rows");
        const result = await getRows({
          connectionId,
          schema: "app",
          table: "users",
          page: 1,
          pageSize: 1,
        });
        expect(result.primaryKey).toEqual(["id"]);
      });

      it("returns the composite primary-key in declaration order", async () => {
        const { getRows } = await import("@/main/table-data-rows");
        const result = await getRows({
          connectionId,
          schema: "app",
          table: "order_items",
          page: 1,
          pageSize: 1,
        });
        expect(result.primaryKey).toEqual(["order_id", "line_number"]);
      });

      it("returns null for a table without a primary key", async () => {
        const { getRows } = await import("@/main/table-data-rows");
        const result = await getRows({
          connectionId,
          schema: "app",
          table: "notes",
          page: 1,
          pageSize: 1,
        });
        expect(result.primaryKey).toBeNull();
      });

      it("returns null for a view", async () => {
        const { getRows } = await import("@/main/table-data-rows");
        const result = await getRows({
          connectionId,
          schema: "app",
          table: "active_users",
          page: 1,
          pageSize: 1,
        });
        expect(result.primaryKey).toBeNull();
      });

      it("returns null for executeQuery results (no single source relation)", async () => {
        const { executeQuery } = await import("@/main/table-data-rows");
        const result = await executeQuery({
          connectionId,
          sql: "SELECT id, email FROM app.users ORDER BY id LIMIT 10",
          page: 1,
          pageSize: 5,
        });
        expect(result.primaryKey).toBeNull();
      });
    });

    // -----------------------------------------------------------------------
    // updateCell — happy paths
    // -----------------------------------------------------------------------

    describe("updateCell", () => {
      it("updates a text column and returns the new row", async () => {
        const { updateCell } = await import("@/main/table-data-write");
        const result = await updateCell({
          connectionId,
          schema: "app",
          table: "users",
          pkColumns: ["id"],
          pkValues: [1],
          column: "display_name",
          pgCast: "text",
          newValue: "Renamed User",
          setNull: false,
        });
        expect(result.row["display_name"]).toBe("Renamed User");
        expect(result.row["id"]).toBe(1);
      });

      it("updates an int4 column", async () => {
        const { updateCell } = await import("@/main/table-data-write");
        const result = await updateCell({
          connectionId,
          schema: "app",
          table: "users",
          pkColumns: ["id"],
          pkValues: [2],
          column: "login_count",
          pgCast: "int4",
          newValue: 42,
          setNull: false,
        });
        expect(result.row["login_count"]).toBe(42);
      });

      it("updates a bool column", async () => {
        const { updateCell } = await import("@/main/table-data-write");
        const result = await updateCell({
          connectionId,
          schema: "app",
          table: "users",
          pkColumns: ["id"],
          pkValues: [3],
          column: "is_verified",
          pgCast: "bool",
          newValue: true,
          setNull: false,
        });
        expect(result.row["is_verified"]).toBe(true);
      });

      it("updates a jsonb column with a nested object", async () => {
        const { updateCell } = await import("@/main/table-data-write");
        const nested = { deep: { count: 9, tags: ["a", "b"] } };
        const result = await updateCell({
          connectionId,
          schema: "app",
          table: "users",
          pkColumns: ["id"],
          pkValues: [4],
          column: "profile",
          pgCast: "jsonb",
          newValue: JSON.stringify(nested),
          setNull: false,
        });
        expect(result.row["profile"]).toEqual(nested);
      });

      it("updates a text[] array column", async () => {
        const { updateCell } = await import("@/main/table-data-write");
        const result = await updateCell({
          connectionId,
          schema: "app",
          table: "users",
          pkColumns: ["id"],
          pkValues: [5],
          column: "tags",
          pgCast: "_text",
          newValue: ["alpha", "beta"],
          setNull: false,
        });
        expect(result.row["tags"]).toEqual(["alpha", "beta"]);
      });

      it("updates a uuid column", async () => {
        const { updateCell } = await import("@/main/table-data-write");
        const uuid = "11111111-2222-3333-4444-555555555555";
        const result = await updateCell({
          connectionId,
          schema: "app",
          table: "users",
          pkColumns: ["id"],
          pkValues: [6],
          column: "external_id",
          pgCast: "uuid",
          newValue: uuid,
          setNull: false,
        });
        expect(result.row["external_id"]).toBe(uuid);
      });

      it("updates a timestamptz column from an ISO string", async () => {
        const { updateCell } = await import("@/main/table-data-write");
        const iso = "2026-01-15T12:30:00.000Z";
        const result = await updateCell({
          connectionId,
          schema: "app",
          table: "users",
          pkColumns: ["id"],
          pkValues: [7],
          column: "created_at",
          pgCast: "timestamptz",
          newValue: iso,
          setNull: false,
        });
        const returned = result.row["created_at"];
        // pg returns a JS Date for timestamptz
        expect(returned).toBeInstanceOf(Date);
        expect((returned as Date).toISOString()).toBe(iso);
      });

      it("updates a numeric column (sent as string to preserve precision)", async () => {
        const { updateCell } = await import("@/main/table-data-write");
        const result = await updateCell({
          connectionId,
          schema: "app",
          table: "users",
          pkColumns: ["id"],
          pkValues: [8],
          column: "score",
          pgCast: "numeric",
          newValue: "12345.67",
          setNull: false,
        });
        expect(result.row["score"]).toBe("12345.67");
      });

      it("updates a row with a composite primary key", async () => {
        const { updateCell } = await import("@/main/table-data-write");
        const result = await updateCell({
          connectionId,
          schema: "app",
          table: "order_items",
          pkColumns: ["order_id", "line_number"],
          pkValues: [1, 1],
          column: "sku",
          pgCast: "text",
          newValue: "SKU-RENAMED",
          setNull: false,
        });
        expect(result.row["sku"]).toBe("SKU-RENAMED");
      });

      it("sets a nullable column to NULL when setNull is true", async () => {
        const { updateCell } = await import("@/main/table-data-write");
        const result = await updateCell({
          connectionId,
          schema: "app",
          table: "users",
          pkColumns: ["id"],
          pkValues: [9],
          column: "profile_note",
          pgCast: "text",
          newValue: "ignored",
          setNull: true,
        });
        expect(result.row["profile_note"]).toBeNull();
      });

      it("handles a column with special characters in its identifier", async () => {
        const { updateCell } = await import("@/main/table-data-write");
        const result = await updateCell({
          connectionId,
          schema: "app",
          table: "injection_target",
          pkColumns: ["id"],
          pkValues: [1],
          column: INJECTION_COLUMN,
          pgCast: "text",
          newValue: "parameterised",
          setNull: false,
        });
        expect(result.row[INJECTION_COLUMN]).toBe("parameterised");
      });

      it("sees preceding updates on the same row via RETURNING", async () => {
        const { updateCell } = await import("@/main/table-data-write");
        await updateCell({
          connectionId,
          schema: "app",
          table: "users",
          pkColumns: ["id"],
          pkValues: [10],
          column: "display_name",
          pgCast: "text",
          newValue: "first",
          setNull: false,
        });
        const second = await updateCell({
          connectionId,
          schema: "app",
          table: "users",
          pkColumns: ["id"],
          pkValues: [10],
          column: "display_name",
          pgCast: "text",
          newValue: "second",
          setNull: false,
        });
        expect(second.row["display_name"]).toBe("second");
      });
    });

    // -----------------------------------------------------------------------
    // updateCell — failures
    // -----------------------------------------------------------------------

    describe("updateCell failures", () => {
      it("rejects writes when read-only mode is on", async () => {
        const { updateCell } = await import("@/main/table-data-write");
        const { updateSettings } = await import("@/main/settings-store");
        updateSettings({ general: { readOnlyMode: true } });

        try {
          await expect(
            updateCell({
              connectionId,
              schema: "app",
              table: "users",
              pkColumns: ["id"],
              pkValues: [11],
              column: "display_name",
              pgCast: "text",
              newValue: "should-not-apply",
              setNull: false,
            }),
          ).rejects.toThrow(/read-only/i);
        } finally {
          updateSettings({ general: { readOnlyMode: false } });
        }
      });

      it("rejects when pkColumns is empty", async () => {
        const { updateCell } = await import("@/main/table-data-write");
        await expect(
          updateCell({
            connectionId,
            schema: "app",
            table: "notes",
            pkColumns: [],
            pkValues: [],
            column: "body",
            pgCast: "text",
            newValue: "nope",
            setNull: false,
          }),
        ).rejects.toThrow(/primary key/i);
      });

      it("rejects when pkColumns and pkValues lengths differ", async () => {
        const { updateCell } = await import("@/main/table-data-write");
        await expect(
          updateCell({
            connectionId,
            schema: "app",
            table: "order_items",
            pkColumns: ["order_id", "line_number"],
            pkValues: [1],
            column: "sku",
            pgCast: "text",
            newValue: "x",
            setNull: false,
          }),
        ).rejects.toThrow(/pk/i);
      });

      it("rejects an unknown pgCast (allowlist)", async () => {
        const { updateCell } = await import("@/main/table-data-write");
        await expect(
          updateCell({
            connectionId,
            schema: "app",
            table: "users",
            pkColumns: ["id"],
            pkValues: [12],
            column: "display_name",
            pgCast: "unknown_type",
            newValue: "nope",
            setNull: false,
          }),
        ).rejects.toThrow(/cast/i);
      });

      it("rejects a pgCast that contains SQL syntax", async () => {
        const { updateCell } = await import("@/main/table-data-write");
        await expect(
          updateCell({
            connectionId,
            schema: "app",
            table: "users",
            pkColumns: ["id"],
            pkValues: [13],
            column: "display_name",
            pgCast: "text; DROP TABLE app.users; --",
            newValue: "nope",
            setNull: false,
          }),
        ).rejects.toThrow(/cast/i);
      });

      it("errors when no row matches the primary key", async () => {
        const { updateCell } = await import("@/main/table-data-write");
        await expect(
          updateCell({
            connectionId,
            schema: "app",
            table: "users",
            pkColumns: ["id"],
            pkValues: [999_999],
            column: "display_name",
            pgCast: "text",
            newValue: "nope",
            setNull: false,
          }),
        ).rejects.toThrow(/not found|no rows/i);
      });

      it("surfaces NOT NULL violations", async () => {
        const { updateCell } = await import("@/main/table-data-write");
        await expect(
          updateCell({
            connectionId,
            schema: "app",
            table: "users",
            pkColumns: ["id"],
            pkValues: [14],
            column: "display_name",
            pgCast: "text",
            newValue: "anything",
            setNull: true,
          }),
        ).rejects.toThrow(/null|not-null|violates/i);
      });

      it("surfaces CHECK constraint violations", async () => {
        const { updateCell } = await import("@/main/table-data-write");
        await expect(
          updateCell({
            connectionId,
            schema: "app",
            table: "users",
            pkColumns: ["id"],
            pkValues: [15],
            column: "status",
            pgCast: "text",
            newValue: "banana",
            setNull: false,
          }),
        ).rejects.toThrow(/check|constraint|violates/i);
      });

      it("surfaces FOREIGN KEY violations", async () => {
        const { updateCell } = await import("@/main/table-data-write");
        await expect(
          updateCell({
            connectionId,
            schema: "app",
            table: "orders",
            pkColumns: ["id"],
            pkValues: [1],
            column: "user_id",
            pgCast: "int4",
            newValue: 999_999,
            setNull: false,
          }),
        ).rejects.toThrow(/foreign key|violates/i);
      });

      it("leaves the injection_target table intact after an identifier-injection attempt", async () => {
        const { updateCell } = await import("@/main/table-data-write");
        const { withPoolClient } = await import("@/main/pg-utils");

        // A malicious column name that would break unquoted SQL.
        await expect(
          updateCell({
            connectionId,
            schema: "app",
            table: "injection_target",
            pkColumns: ["id"],
            pkValues: [2],
            column: '"; DROP TABLE app.injection_target; --',
            pgCast: "text",
            newValue: "whatever",
            setNull: false,
          }),
        ).rejects.toThrow();

        const stillExists = await withPoolClient(connectionId, async (c) => {
          const r = await c.query<{ count: string }>(
            "SELECT count(*) AS count FROM app.injection_target",
          );
          return Number.parseInt(r.rows[0]!.count, 10);
        });
        expect(stillExists).toBe(3);
      });
    });

    // -----------------------------------------------------------------------
    // Enum support — metadata + updateCell
    // -----------------------------------------------------------------------

    describe("enum columns", () => {
      it("returns enumLabels on the enum column and omits it on non-enum columns", async () => {
        const { getRows } = await import("@/main/table-data-rows");
        const result = await getRows({
          connectionId,
          schema: "app",
          table: "users",
          page: 1,
          pageSize: 1,
        });
        const roleCol = result.columns.find((c) => c.name === "role");
        expect(roleCol).toBeDefined();
        expect(roleCol?.enumLabels).toEqual(["admin", "editor", "viewer"]);
        expect(roleCol?.enumPgCast).toBe('"app"."user_role"');

        const statusCol = result.columns.find((c) => c.name === "status");
        expect(statusCol).toBeDefined();
        expect(statusCol?.enumLabels).toBeUndefined();
        expect(statusCol?.enumPgCast).toBeUndefined();
      });

      it("populates enumLabels on executeQuery results too", async () => {
        const { executeQuery } = await import("@/main/table-data-rows");
        const result = await executeQuery({
          connectionId,
          sql: "SELECT id, role FROM app.users ORDER BY id LIMIT 5",
          page: 1,
          pageSize: 5,
        });
        const roleCol = result.columns.find((c) => c.name === "role");
        expect(roleCol?.enumLabels).toEqual(["admin", "editor", "viewer"]);
        expect(roleCol?.enumPgCast).toBe('"app"."user_role"');
      });

      it("updates an enum column using the schema-qualified enum pgCast", async () => {
        const { updateCell } = await import("@/main/table-data-write");
        const result = await updateCell({
          connectionId,
          schema: "app",
          table: "users",
          pkColumns: ["id"],
          pkValues: [30],
          column: "role",
          pgCast: '"app"."user_role"',
          newValue: "admin",
          setNull: false,
        });
        expect(result.row["role"]).toBe("admin");
      });

      it("rejects an enum-shaped cast that does not name a real enum", async () => {
        const { updateCell } = await import("@/main/table-data-write");
        await expect(
          updateCell({
            connectionId,
            schema: "app",
            table: "users",
            pkColumns: ["id"],
            pkValues: [31],
            column: "role",
            pgCast: "nonexistent_enum",
            newValue: "admin",
            setNull: false,
          }),
        ).rejects.toThrow(/cast/i);
      });

      it("rejects an enum cast name that fails the shape check", async () => {
        const { updateCell } = await import("@/main/table-data-write");
        await expect(
          updateCell({
            connectionId,
            schema: "app",
            table: "users",
            pkColumns: ["id"],
            pkValues: [32],
            column: "role",
            pgCast: "UserRole",
            newValue: "admin",
            setNull: false,
          }),
        ).rejects.toThrow(/cast/i);
      });

      it("surfaces invalid-enum-value errors from Postgres", async () => {
        const { updateCell } = await import("@/main/table-data-write");
        await expect(
          updateCell({
            connectionId,
            schema: "app",
            table: "users",
            pkColumns: ["id"],
            pkValues: [33],
            column: "role",
            pgCast: '"app"."user_role"',
            newValue: "banana",
            setNull: false,
          }),
        ).rejects.toThrow(/invalid|enum/i);
      });
    });

    // -----------------------------------------------------------------------
    // Extension-gated updateCell cases (PostGIS, pgvector)
    // -----------------------------------------------------------------------

    describe("updateCell (extension-gated)", () => {
      it("updates a PostGIS geometry column from WKT", async () => {
        const postgis = await hasExtension(connectionId, "postgis");
        const hasLocation = await hasColumn(
          connectionId,
          "app",
          "users",
          "location",
        );
        if (!postgis || !hasLocation) {
          return;
        }

        const { updateCell } = await import("@/main/table-data-write");
        const result = await updateCell({
          connectionId,
          schema: "app",
          table: "users",
          pkColumns: ["id"],
          pkValues: [20],
          column: "location",
          pgCast: "geometry",
          newValue: "SRID=4326;POINT(13.405 52.52)",
          setNull: false,
        });
        // PostGIS returns hex-encoded EWKB in pg's default type parser.
        expect(typeof result.row["location"]).toBe("string");
        expect(String(result.row["location"]).length).toBeGreaterThan(0);
      });

      it("updates a pgvector column", async () => {
        const pgvector = await hasExtension(connectionId, "vector");
        const hasEmbedding = await hasColumn(
          connectionId,
          "app",
          "users",
          "embedding",
        );
        if (!pgvector || !hasEmbedding) {
          return;
        }

        const { updateCell } = await import("@/main/table-data-write");
        const result = await updateCell({
          connectionId,
          schema: "app",
          table: "users",
          pkColumns: ["id"],
          pkValues: [21],
          column: "embedding",
          pgCast: "vector",
          newValue: "[0.1,0.2,0.3]",
          setNull: false,
        });
        expect(String(result.row["embedding"])).toContain("0.1");
      });
    });

    // -----------------------------------------------------------------------
    // updateRow — atomic multi-column UPDATE
    // -----------------------------------------------------------------------

    describe("updateRow", () => {
      it("applies multiple field changes in a single atomic UPDATE", async () => {
        const { updateRow } = await import("@/main/table-data-write");
        const result = await updateRow({
          connectionId,
          schema: "app",
          table: "users",
          pkColumns: ["id"],
          pkValues: [50],
          changes: [
            {
              column: "display_name",
              pgCast: "text",
              newValue: "Multi A",
              setNull: false,
            },
            {
              column: "login_count",
              pgCast: "int4",
              newValue: 77,
              setNull: false,
            },
          ],
        });
        expect(result.row["display_name"]).toBe("Multi A");
        expect(result.row["login_count"]).toBe(77);
        expect(result.row["id"]).toBe(50);
      });

      it("mixes a value change with setNull in one call", async () => {
        const { updateRow } = await import("@/main/table-data-write");
        const result = await updateRow({
          connectionId,
          schema: "app",
          table: "users",
          pkColumns: ["id"],
          pkValues: [51],
          changes: [
            {
              column: "display_name",
              pgCast: "text",
              newValue: "Mixed",
              setNull: false,
            },
            {
              column: "profile_note",
              pgCast: "text",
              newValue: null,
              setNull: true,
            },
          ],
        });
        expect(result.row["display_name"]).toBe("Mixed");
        expect(result.row["profile_note"]).toBeNull();
      });

      it("rolls back ALL changes when one column fails (CHECK violation)", async () => {
        const { updateRow } = await import("@/main/table-data-write");
        const { withPoolClient } = await import("@/main/pg-utils");

        const before = await withPoolClient(connectionId, async (c) => {
          const r = await c.query(
            "SELECT display_name FROM app.users WHERE id = 52",
          );
          return r.rows[0]!.display_name as string;
        });

        await expect(
          updateRow({
            connectionId,
            schema: "app",
            table: "users",
            pkColumns: ["id"],
            pkValues: [52],
            changes: [
              {
                column: "display_name",
                pgCast: "text",
                newValue: "Should Not Land",
                setNull: false,
              },
              {
                column: "status",
                pgCast: "text",
                newValue: "banana",
                setNull: false,
              },
            ],
          }),
        ).rejects.toThrow(/check|constraint|violates/i);

        const after = await withPoolClient(connectionId, async (c) => {
          const r = await c.query(
            "SELECT display_name FROM app.users WHERE id = 52",
          );
          return r.rows[0]!.display_name as string;
        });
        expect(after).toBe(before);
      });

      it("supports composite primary keys", async () => {
        const { updateRow } = await import("@/main/table-data-write");
        const result = await updateRow({
          connectionId,
          schema: "app",
          table: "order_items",
          pkColumns: ["order_id", "line_number"],
          pkValues: [1, 2],
          changes: [
            {
              column: "sku",
              pgCast: "text",
              newValue: "SKU-MULTI",
              setNull: false,
            },
          ],
        });
        expect(result.row["sku"]).toBe("SKU-MULTI");
      });

      it("rejects when read-only mode is on", async () => {
        const { updateRow } = await import("@/main/table-data-write");
        const { updateSettings } = await import("@/main/settings-store");
        updateSettings({ general: { readOnlyMode: true } });
        try {
          await expect(
            updateRow({
              connectionId,
              schema: "app",
              table: "users",
              pkColumns: ["id"],
              pkValues: [53],
              changes: [
                {
                  column: "display_name",
                  pgCast: "text",
                  newValue: "x",
                  setNull: false,
                },
              ],
            }),
          ).rejects.toThrow(/read-only/i);
        } finally {
          updateSettings({ general: { readOnlyMode: false } });
        }
      });

      it("rejects when pkColumns is empty", async () => {
        const { updateRow } = await import("@/main/table-data-write");
        await expect(
          updateRow({
            connectionId,
            schema: "app",
            table: "notes",
            pkColumns: [],
            pkValues: [],
            changes: [
              { column: "body", pgCast: "text", newValue: "x", setNull: false },
            ],
          }),
        ).rejects.toThrow(/primary key/i);
      });

      it("rejects an empty changes array", async () => {
        const { updateRow } = await import("@/main/table-data-write");
        await expect(
          updateRow({
            connectionId,
            schema: "app",
            table: "users",
            pkColumns: ["id"],
            pkValues: [54],
            changes: [],
          }),
        ).rejects.toThrow(/no changes/i);
      });

      it("rejects duplicate columns in the changes array", async () => {
        const { updateRow } = await import("@/main/table-data-write");
        await expect(
          updateRow({
            connectionId,
            schema: "app",
            table: "users",
            pkColumns: ["id"],
            pkValues: [55],
            changes: [
              {
                column: "display_name",
                pgCast: "text",
                newValue: "a",
                setNull: false,
              },
              {
                column: "display_name",
                pgCast: "text",
                newValue: "b",
                setNull: false,
              },
            ],
          }),
        ).rejects.toThrow(/duplicate/i);
      });

      it("rejects an unknown pgCast in any change", async () => {
        const { updateRow } = await import("@/main/table-data-write");
        await expect(
          updateRow({
            connectionId,
            schema: "app",
            table: "users",
            pkColumns: ["id"],
            pkValues: [56],
            changes: [
              {
                column: "display_name",
                pgCast: "text",
                newValue: "ok",
                setNull: false,
              },
              {
                column: "login_count",
                pgCast: "totally_made_up",
                newValue: 1,
                setNull: false,
              },
            ],
          }),
        ).rejects.toThrow(/cast/i);
      });

      it("rejects when pkColumns and pkValues lengths differ", async () => {
        const { updateRow } = await import("@/main/table-data-write");
        await expect(
          updateRow({
            connectionId,
            schema: "app",
            table: "order_items",
            pkColumns: ["order_id", "line_number"],
            pkValues: [1],
            changes: [
              { column: "sku", pgCast: "text", newValue: "x", setNull: false },
            ],
          }),
        ).rejects.toThrow(/pk/i);
      });

      it("errors when no row matches the primary key", async () => {
        const { updateRow } = await import("@/main/table-data-write");
        await expect(
          updateRow({
            connectionId,
            schema: "app",
            table: "users",
            pkColumns: ["id"],
            pkValues: [999_999],
            changes: [
              {
                column: "display_name",
                pgCast: "text",
                newValue: "x",
                setNull: false,
              },
            ],
          }),
        ).rejects.toThrow(/not found|no rows/i);
      });

      it("handles a column with special characters in its identifier", async () => {
        const { updateRow } = await import("@/main/table-data-write");
        const result = await updateRow({
          connectionId,
          schema: "app",
          table: "injection_target",
          pkColumns: ["id"],
          pkValues: [3],
          changes: [
            {
              column: INJECTION_COLUMN,
              pgCast: "text",
              newValue: "atomic",
              setNull: false,
            },
          ],
        });
        expect(result.row[INJECTION_COLUMN]).toBe("atomic");
      });
    });

    // -----------------------------------------------------------------------
    // deleteRows
    // -----------------------------------------------------------------------

    async function resetDeleteTarget(): Promise<void> {
      const { withPoolClient } = await import("@/main/pg-utils");
      await withPoolClient(connectionId, async (client) => {
        await client.query("DROP TABLE IF EXISTS app.delete_target");
        await client.query(
          "CREATE TABLE app.delete_target (id SERIAL PRIMARY KEY, category TEXT NOT NULL)",
        );
        await client.query(
          "INSERT INTO app.delete_target (category) VALUES ('old'), ('old'), ('old'), ('keep'), ('keep')",
        );
      });
    }

    async function countDeleteTarget(where = "TRUE"): Promise<number> {
      const { withPoolClient } = await import("@/main/pg-utils");
      return withPoolClient(connectionId, async (client) => {
        const result = await client.query<{ count: string }>(
          `SELECT count(*) AS count FROM app.delete_target WHERE ${where}`,
        );
        return Number.parseInt(result.rows[0]!.count, 10);
      });
    }

    describe("deleteRows", () => {
      it("deletes rows matching the current filter and returns the deleted count", async () => {
        await resetDeleteTarget();
        const { deleteRows } = await import("@/main/table-data-write");

        const result = await deleteRows({
          connectionId,
          schema: "app",
          table: "delete_target",
          whereClause: "category = 'old'",
        });

        expect(result.deletedCount).toBe(3);
        expect(await countDeleteTarget()).toBe(2);
        expect(await countDeleteTarget("category = 'keep'")).toBe(2);
      });

      it("returns zero when the current filter matches no rows", async () => {
        await resetDeleteTarget();
        const { deleteRows } = await import("@/main/table-data-write");

        const result = await deleteRows({
          connectionId,
          schema: "app",
          table: "delete_target",
          whereClause: "category = 'missing'",
        });

        expect(result.deletedCount).toBe(0);
        expect(await countDeleteTarget()).toBe(5);
      });

      it("deletes all rows when no filter is provided", async () => {
        await resetDeleteTarget();
        const { deleteRows } = await import("@/main/table-data-write");

        const result = await deleteRows({
          connectionId,
          schema: "app",
          table: "delete_target",
        });

        expect(result.deletedCount).toBe(5);
        expect(await countDeleteTarget()).toBe(0);
      });

      it("rejects deletes when read-only mode is on", async () => {
        await resetDeleteTarget();
        const { deleteRows } = await import("@/main/table-data-write");
        const { updateSettings } = await import("@/main/settings-store");
        updateSettings({ general: { readOnlyMode: true } });

        try {
          await expect(
            deleteRows({
              connectionId,
              schema: "app",
              table: "delete_target",
              whereClause: "category = 'old'",
            }),
          ).rejects.toThrow(/read-only/i);
        } finally {
          updateSettings({ general: { readOnlyMode: false } });
        }

        expect(await countDeleteTarget()).toBe(5);
      });
    });

    // -----------------------------------------------------------------------
    // Foreign-key metadata + searchForeignKey
    // -----------------------------------------------------------------------

    describe("foreign-key metadata", () => {
      it("attaches a single-column FK ref to the child column with a label heuristic match", async () => {
        const { getRows } = await import("@/main/table-data-rows");
        const result = await getRows({
          connectionId,
          schema: "app",
          table: "orders",
          page: 1,
          pageSize: 1,
        });
        const userIdCol = result.columns.find((c) => c.name === "user_id");
        expect(userIdCol?.foreignKey).toEqual({
          schema: "app",
          table: "users",
          column: "id",
          labelColumn: "display_name",
          valuePgCast: "int4",
        });
      });

      it("returns labelColumn = null when no candidate matches the heuristic", async () => {
        const { getRows } = await import("@/main/table-data-rows");
        const result = await getRows({
          connectionId,
          schema: "app",
          table: "order_items",
          page: 1,
          pageSize: 1,
        });
        const fkCol = result.columns.find((c) => c.name === "order_id");
        expect(fkCol?.foreignKey).toEqual({
          schema: "app",
          table: "orders",
          column: "id",
          labelColumn: null,
          valuePgCast: "int4",
        });
      });

      it("does not attach FK metadata to non-FK columns", async () => {
        const { getRows } = await import("@/main/table-data-rows");
        const result = await getRows({
          connectionId,
          schema: "app",
          table: "users",
          page: 1,
          pageSize: 1,
        });
        for (const col of result.columns) {
          expect(col.foreignKey).toBeUndefined();
        }
      });
    });

    describe("searchForeignKey", () => {
      it("returns options with both value and label when a label column is set", async () => {
        const { searchForeignKey } = await import("@/main/table-data-fk");
        const result = await searchForeignKey({
          connectionId,
          schema: "app",
          table: "users",
          valueColumn: "id",
          labelColumn: "display_name",
          query: "",
          limit: 10,
        });
        expect(result.options.length).toBe(10);
        expect(result.options[0]).toMatchObject({
          value: expect.any(Number),
          label: expect.any(String),
        });
        expect(result.hasMore).toBe(true);
      });

      it("filters by label column substring when a query is provided", async () => {
        const { searchForeignKey } = await import("@/main/table-data-fk");
        const result = await searchForeignKey({
          connectionId,
          schema: "app",
          table: "users",
          valueColumn: "id",
          labelColumn: "display_name",
          query: "User 12",
          limit: 50,
        });
        // Matches: "User 12", "User 120", "User 121"... but seeds stop at 120,
        // so { 12, 120 } — only label-substring matches that include "User 12".
        const labels = result.options.map((o) => o.label);
        expect(labels).toEqual(expect.arrayContaining(["User 12", "User 120"]));
        for (const opt of result.options) {
          expect(String(opt.label)).toContain("User 12");
        }
      });

      it("also matches the value column as text when query is non-empty", async () => {
        const { searchForeignKey } = await import("@/main/table-data-fk");
        const result = await searchForeignKey({
          connectionId,
          schema: "app",
          table: "users",
          valueColumn: "id",
          labelColumn: "display_name",
          query: "42",
          limit: 50,
        });
        const values = result.options.map((o) => Number(o.value));
        expect(values).toContain(42);
      });

      it("returns label = null when no label column is provided", async () => {
        const { searchForeignKey } = await import("@/main/table-data-fk");
        const result = await searchForeignKey({
          connectionId,
          schema: "app",
          table: "users",
          valueColumn: "id",
          labelColumn: null,
          query: "",
          limit: 5,
        });
        expect(result.options.every((o) => o.label === null)).toBe(true);
        expect(result.options.length).toBe(5);
      });

      it("clamps limit to at most 200 (reads limit + 1 to detect more)", async () => {
        const { searchForeignKey } = await import("@/main/table-data-fk");
        const result = await searchForeignKey({
          connectionId,
          schema: "app",
          table: "users",
          valueColumn: "id",
          labelColumn: null,
          query: "",
          limit: 999_999,
        });
        // With 120 rows and a clamp at 200, we see all 120 and hasMore = false.
        expect(result.options.length).toBe(120);
        expect(result.hasMore).toBe(false);
      });

      it("rejects identifier injection through the schema/table/column", async () => {
        const { searchForeignKey } = await import("@/main/table-data-fk");
        await expect(
          searchForeignKey({
            connectionId,
            schema: "app",
            table: 'users"; DROP TABLE app.users; --',
            valueColumn: "id",
            labelColumn: null,
            query: "",
            limit: 5,
          }),
        ).rejects.toThrow();

        // Original table still intact.
        const { getRows } = await import("@/main/table-data-rows");
        const rows = await getRows({
          connectionId,
          schema: "app",
          table: "users",
          page: 1,
          pageSize: 1,
        });
        expect(rows.totalCount).toBeGreaterThan(0);
      });
    });
  });
}
