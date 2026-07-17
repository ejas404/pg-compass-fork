import type { ConnectionConfig } from "@/shared/types/connection";

export function buildConnectionString(
  connection: ConnectionConfig,
): string | null {
  if (connection.mode === "uri") {
    return connection.uri?.trim() || null;
  }

  const fields = connection.fields;
  if (!fields) {
    return null;
  }

  const url = new URL("postgresql://localhost");
  url.hostname = fields.host;
  url.port = String(fields.port);
  url.pathname = `/${encodeURIComponent(fields.database)}`;
  url.username = fields.user;
  url.password = fields.password;

  return url.toString();
}
