import { describe, expect, it } from "vitest";
import {
  tryParsePostgresUrl,
  validateConnectionInput,
} from "@/components/connections/ConnectionFormDialog";

describe("ConnectionFormDialog helpers", () => {
  it("parses postgres URLs pasted into the host field", () => {
    expect(
      tryParsePostgresUrl(
        "postgresql://postgres:secret@localhost:5433/pg_compass",
      ),
    ).toEqual({
      host: "localhost",
      port: 5433,
      database: "pg_compass",
      user: "postgres",
      password: "secret",
    });
  });

  it("validates both URI and individual-field modes", () => {
    expect(
      validateConnectionInput("uri", "", {
        host: "",
        port: 5432,
        database: "",
        user: "",
        password: "",
      }),
    ).toEqual({ uri: "Connection URI is required." });

    expect(
      validateConnectionInput("fields", "", {
        host: "",
        port: 70000,
        database: "",
        user: "",
        password: "",
      }),
    ).toEqual({
      host: "Host is required.",
      database: "Database name is required.",
      port: "Port must be a number between 1 and 65535.",
    });
  });
});
