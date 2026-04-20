import { describe, expect, it } from "vitest";
import {
  isReadOnlyQuery,
  stripLimitOffset,
} from "@/main/table-data-rows";
import {
  buildExportSql,
  csvEscapeValue,
  csvQuoteField,
} from "@/main/table-data-export";
import { assertSafePgCast } from "@/main/table-data-write";

describe("table-data query helpers", () => {
  it("accepts read-only queries and rejects mutating ones", () => {
    expect(isReadOnlyQuery("SELECT * FROM app.users")).toBe(true);
    expect(isReadOnlyQuery(" with q as (select 1) select * from q")).toBe(true);
    expect(isReadOnlyQuery("DELETE FROM app.users")).toBe(false);
  });

  it("strips trailing limit and offset without changing the core SQL", () => {
    expect(
      stripLimitOffset("SELECT * FROM app.users LIMIT 25 OFFSET 50"),
    ).toEqual({
      core: "SELECT * FROM app.users",
      userLimit: 25,
    });
  });
});

describe("table-data export helpers", () => {
  it("quotes CSV fields when required", () => {
    expect(csvQuoteField("hello")).toBe("hello");
    expect(csvQuoteField("hello,world")).toBe('"hello,world"');
    expect(csvEscapeValue({ ok: true })).toBe('"{""ok"":true}"');
  });

  it("builds export SQL from table exports and query exports", () => {
    expect(
      buildExportSql({
        connectionId: "c1",
        format: "csv",
        filePath: "users.csv",
        schema: "app",
        table: "users",
      }),
    ).toBe('SELECT * FROM "app"."users"');

    expect(
      buildExportSql({
        connectionId: "c1",
        format: "json",
        filePath: "query.json",
        sql: "SELECT * FROM app.users;",
      }),
    ).toBe("SELECT * FROM app.users");
  });
});

describe("assertSafePgCast", () => {
  it.each([
    "text",
    "int2",
    "int4",
    "int8",
    "float4",
    "float8",
    "numeric",
    "bool",
    "uuid",
    "json",
    "jsonb",
    "date",
    "time",
    "timestamp",
    "timestamptz",
    "_int4",
    "_text",
    "geometry",
    "geography",
    "vector",
  ])("accepts %s", (cast) => {
    expect(() => assertSafePgCast(cast)).not.toThrow();
  });

  it.each([
    "text; DROP TABLE x",
    "unknown_type",
    "",
    "INT4",
    "int4 WITH TIME ZONE",
    "text OR 1=1",
    "jsonb); DELETE FROM users; --",
  ])("rejects %s", (cast) => {
    expect(() => assertSafePgCast(cast)).toThrow(/cast/i);
  });
});
