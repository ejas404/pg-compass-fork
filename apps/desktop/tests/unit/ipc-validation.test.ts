import { describe, expect, it } from "vitest";
import {
  validateConnectionInput,
  validateCreateRoleInput,
  validateDbAccessInput,
  validateDbReadonlyGrantInput,
  validateDropRoleInput,
  validateExportDataParams,
  validateGetRowsParams,
  validateMembershipInput,
  validateRolesSnapshotInput,
  validateSettingsPatch,
  validateUpdateRowParams,
} from "@/main/ipc-validation";

describe("IPC runtime validation", () => {
  it("accepts a valid connection and rejects an invalid port", () => {
    const connection = {
      label: "Local",
      favourite: false,
      mode: "fields" as const,
      fields: {
        host: "localhost",
        port: 5432,
        database: "postgres",
        user: "postgres",
        password: "",
      },
    };

    expect(validateConnectionInput(connection)).toBe(connection);
    expect(() =>
      validateConnectionInput({
        ...connection,
        fields: { ...connection.fields, port: 70_000 },
      }),
    ).toThrow(/port/);

    expect(() =>
      validateConnectionInput({ ...connection, unexpected: true }),
    ).toThrow(/unexpected/);
  });

  it("rejects payloads for the inactive connection mode", () => {
    expect(() =>
      validateConnectionInput({
        label: "URI",
        favourite: false,
        mode: "uri",
        uri: "postgres://localhost/postgres",
        fields: { arbitrary: "payload" },
      }),
    ).toThrow(/fields is not allowed/);

    expect(() =>
      validateConnectionInput({
        label: "Fields",
        favourite: false,
        mode: "fields",
        uri: "postgres://unexpected",
        fields: {
          host: "localhost",
          port: 5432,
          database: "postgres",
          user: "postgres",
          password: "",
        },
      }),
    ).toThrow(/uri is not allowed/);
  });

  it("bounds pagination values", () => {
    expect(() =>
      validateGetRowsParams({
        connectionId: "connection",
        schema: "public",
        table: "users",
        page: 1,
        pageSize: 101,
      }),
    ).toThrow(/pageSize/);
  });

  it("requires export source fields to be mutually exclusive", () => {
    expect(() =>
      validateExportDataParams({
        connectionId: "connection",
        format: "csv",
        filePath: "export.csv",
        schema: "public",
        table: "users",
        sql: "SELECT * FROM users",
      }),
    ).toThrow(/either sql or both schema and table/);

    expect(() =>
      validateExportDataParams({
        connectionId: "connection",
        format: "csv",
        filePath: "export.csv",
        table: "users",
        sql: "SELECT * FROM users",
      }),
    ).toThrow(/either sql or both schema and table/);
  });

  it("requires primary-key columns and values to align", () => {
    expect(() =>
      validateUpdateRowParams({
        connectionId: "connection",
        schema: "public",
        table: "users",
        pkColumns: ["id"],
        pkValues: [],
        changes: [
          {
            column: "name",
            pgCast: "text",
            newValue: "Ada",
            setNull: false,
          },
        ],
      }),
    ).toThrow(/pkValues/);

    expect(() =>
      validateUpdateRowParams({
        connectionId: "connection",
        schema: "public",
        table: "users",
        pkColumns: [],
        pkValues: [],
        changes: [
          {
            column: "name",
            pgCast: "text",
            newValue: "Ada",
            setNull: false,
          },
        ],
      }),
    ).toThrow(/pkColumns/);
  });

  it("rejects malformed settings patches", () => {
    expect(() =>
      validateSettingsPatch({
        general: { readOnlyMode: "yes" },
      }),
    ).toThrow(/readOnlyMode/);

    expect(() =>
      validateSettingsPatch({
        general: { readOnlyMode: true, unexpected: "persist me" },
      }),
    ).toThrow(/unexpected/);
  });

  describe("roles / RBAC", () => {
    it("accepts a snapshot request", () => {
      expect(
        validateRolesSnapshotInput({
          connectionId: "c1",
          targetUser: "reader",
        }),
      ).toEqual({ connectionId: "c1", targetUser: "reader" });
    });

    it("rejects an invalid role name in create-role", () => {
      expect(() =>
        validateCreateRoleInput({
          connectionId: "c1",
          name: "bad-name!",
          login: true,
        }),
      ).toThrow(/valid PostgreSQL identifier/);

      expect(
        validateCreateRoleInput({
          connectionId: "c1",
          name: "reader",
          login: true,
        }).name,
      ).toBe("reader");
    });

    it("rejects unexpected keys in membership input", () => {
      expect(() =>
        validateMembershipInput({
          connectionId: "c1",
          memberName: "reader",
          parentRoleName: "admins",
          extra: true,
        }),
      ).toThrow(/extra/);
    });

    it("rejects invalid database names in db access input", () => {
      expect(() =>
        validateDbAccessInput({
          connectionId: "c1",
          userName: "reader",
          databaseName: "DB WITH SPACES",
        }),
      ).toThrow(/valid database name/);
    });

    it("validates the schema override in readonly grants", () => {
      expect(
        validateDbReadonlyGrantInput({
          connectionId: "c1",
          userName: "reader",
          databaseName: "app",
          schema: "reporting",
        }).schema,
      ).toBe("reporting");
    });

    it("drops unknown keys from drop-role payloads", () => {
      expect(() =>
        validateDropRoleInput({
          connectionId: "c1",
          name: "reader",
          force: true,
        }),
      ).toThrow(/force/);
    });
  });
});
