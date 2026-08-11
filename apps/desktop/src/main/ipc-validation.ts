import type {
  ConnectionFileDialogOptions,
  ConnectionInput,
  SchemaTreeOptions,
} from "../shared/types/connection";
import type { AppSettingsPatch } from "../shared/types/settings";
import type {
  CancelQueryParams,
  DeleteRowsParams,
  ExecuteQueryParams,
  ExportDataParams,
  GetRowsParams,
  ImportDataParams,
  InsertRowParams,
  OpenDialogOptions,
  SaveDialogOptions,
  SearchForeignKeyParams,
  SqlDumpParams,
  TableMetaParams,
  ToggleTriggerParams,
  UpdateCellParams,
  UpdateRowParams,
} from "../shared/types/table-data";
import { serialize } from "node:v8";

const MAX_IDENTIFIER_LENGTH = 256;
const MAX_PATH_LENGTH = 4_096;
const MAX_SQL_LENGTH = 1_000_000;

type UnknownRecord = Record<string, unknown>;

function assertAllowedKeys(
  record: UnknownRecord,
  name: string,
  allowedKeys: readonly string[],
): void {
  const allowed = new Set(allowedKeys);
  const unknownKey = Object.keys(record).find((key) => !allowed.has(key));
  if (unknownKey) {
    throw new TypeError(`${name}.${unknownKey} is not allowed.`);
  }
}

function assertSerializedSize(
  value: unknown,
  name: string,
  maximumBytes = 2_000_000,
): void {
  try {
    if (serialize(value).byteLength > maximumBytes) {
      throw new TypeError(
        `${name} exceeds the ${maximumBytes}-byte payload limit.`,
      );
    }
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("payload limit")) {
      throw error;
    }
    throw new TypeError(`${name} contains an unsupported value.`);
  }
}

function asRecord(value: unknown, name: string): UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object.`);
  }

  return value as UnknownRecord;
}

function asString(
  value: unknown,
  name: string,
  options: { maxLength?: number; allowEmpty?: boolean } = {},
): string {
  const { maxLength = MAX_IDENTIFIER_LENGTH, allowEmpty = false } = options;

  if (typeof value !== "string") {
    throw new TypeError(`${name} must be a string.`);
  }
  if (!allowEmpty && value.trim().length === 0) {
    throw new TypeError(`${name} must not be empty.`);
  }
  if (value.length > maxLength) {
    throw new TypeError(`${name} exceeds the ${maxLength}-character limit.`);
  }

  return value;
}

function asOptionalString(
  value: unknown,
  name: string,
  options?: { maxLength?: number; allowEmpty?: boolean },
): string | undefined {
  return value === undefined ? undefined : asString(value, name, options);
}

function asBoolean(value: unknown, name: string): boolean {
  if (typeof value !== "boolean") {
    throw new TypeError(`${name} must be a boolean.`);
  }
  return value;
}

function asOptionalBoolean(value: unknown, name: string): boolean | undefined {
  return value === undefined ? undefined : asBoolean(value, name);
}

function asInteger(
  value: unknown,
  name: string,
  minimum: number,
  maximum: number,
): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw new TypeError(
      `${name} must be an integer between ${minimum} and ${maximum}.`,
    );
  }

  return value;
}

function validateStringArray(
  value: unknown,
  name: string,
  maximumItems = 128,
): string[] {
  if (!Array.isArray(value) || value.length > maximumItems) {
    throw new TypeError(
      `${name} must be an array of at most ${maximumItems} strings.`,
    );
  }

  return value.map((item, index) => asString(item, `${name}[${index}]`));
}

function validateDialogFilters(value: unknown, name: string): void {
  if (value === undefined) {
    return;
  }
  if (!Array.isArray(value) || value.length > 20) {
    throw new TypeError(`${name} must contain at most 20 filters.`);
  }

  value.forEach((filter, index) => {
    const record = asRecord(filter, `${name}[${index}]`);
    assertAllowedKeys(record, `${name}[${index}]`, ["name", "extensions"]);
    asString(record.name, `${name}[${index}].name`);
    validateStringArray(record.extensions, `${name}[${index}].extensions`, 20);
  });
}

function validateTableIdentity(
  value: unknown,
  name: string,
  extraKeys: readonly string[] = [],
): UnknownRecord {
  const record = asRecord(value, name);
  assertAllowedKeys(record, name, [
    "connectionId",
    "schema",
    "table",
    ...extraKeys,
  ]);
  asString(record.connectionId, `${name}.connectionId`);
  asString(record.schema, `${name}.schema`);
  asString(record.table, `${name}.table`);
  return record;
}

export function validateConnectionId(value: unknown): string {
  return asString(value, "connectionId");
}

export function validateConnectionInput(value: unknown): ConnectionInput {
  assertSerializedSize(value, "connection");
  const input = asRecord(value, "connection");
  assertAllowedKeys(input, "connection", [
    "label",
    "color",
    "favourite",
    "mode",
    "uri",
    "fields",
    "ssl",
    "ssh",
  ]);
  asString(input.label, "connection.label");
  asOptionalString(input.color, "connection.color", { maxLength: 32 });
  asBoolean(input.favourite, "connection.favourite");

  if (input.mode !== "uri" && input.mode !== "fields") {
    throw new TypeError("connection.mode must be either uri or fields.");
  }

  if (input.mode === "uri") {
    asString(input.uri, "connection.uri", { maxLength: 8_192 });
    if (input.fields !== undefined) {
      throw new TypeError(
        "connection.fields is not allowed when connection.mode is uri.",
      );
    }
  } else {
    if (input.uri !== undefined) {
      throw new TypeError(
        "connection.uri is not allowed when connection.mode is fields.",
      );
    }
    const fields = asRecord(input.fields, "connection.fields");
    assertAllowedKeys(fields, "connection.fields", [
      "host",
      "port",
      "database",
      "user",
      "password",
    ]);
    asString(fields.host, "connection.fields.host");
    asInteger(fields.port, "connection.fields.port", 1, 65_535);
    asString(fields.database, "connection.fields.database");
    asString(fields.user, "connection.fields.user");
    asString(fields.password, "connection.fields.password", {
      maxLength: 8_192,
      allowEmpty: true,
    });
  }

  if (input.ssl !== undefined) {
    const ssl = asRecord(input.ssl, "connection.ssl");
    assertAllowedKeys(ssl, "connection.ssl", [
      "enabled",
      "rejectUnauthorized",
      "caSource",
      "ca",
      "cert",
      "key",
    ]);
    asBoolean(ssl.enabled, "connection.ssl.enabled");
    asOptionalBoolean(
      ssl.rejectUnauthorized,
      "connection.ssl.rejectUnauthorized",
    );
    if (
      ssl.caSource !== undefined &&
      ssl.caSource !== "file" &&
      ssl.caSource !== "inline"
    ) {
      throw new TypeError("connection.ssl.caSource is invalid.");
    }
    asOptionalString(ssl.ca, "connection.ssl.ca", {
      maxLength: 1_000_000,
      allowEmpty: true,
    });
    asOptionalString(ssl.cert, "connection.ssl.cert", {
      maxLength: MAX_PATH_LENGTH,
      allowEmpty: true,
    });
    asOptionalString(ssl.key, "connection.ssl.key", {
      maxLength: MAX_PATH_LENGTH,
      allowEmpty: true,
    });
  }

  if (input.ssh !== undefined) {
    const ssh = asRecord(input.ssh, "connection.ssh");
    assertAllowedKeys(ssh, "connection.ssh", [
      "enabled",
      "host",
      "port",
      "user",
      "authMethod",
      "password",
      "privateKeyPath",
      "passphrase",
    ]);
    asBoolean(ssh.enabled, "connection.ssh.enabled");
    asString(ssh.host, "connection.ssh.host");
    asInteger(ssh.port, "connection.ssh.port", 1, 65_535);
    asString(ssh.user, "connection.ssh.user");
    if (ssh.authMethod !== "password" && ssh.authMethod !== "privateKey") {
      throw new TypeError("connection.ssh.authMethod is invalid.");
    }
    asOptionalString(ssh.password, "connection.ssh.password", {
      maxLength: 8_192,
      allowEmpty: true,
    });
    asOptionalString(ssh.privateKeyPath, "connection.ssh.privateKeyPath", {
      maxLength: MAX_PATH_LENGTH,
      allowEmpty: true,
    });
    asOptionalString(ssh.passphrase, "connection.ssh.passphrase", {
      maxLength: 8_192,
      allowEmpty: true,
    });
  }

  return value as ConnectionInput;
}

export function validateSchemaTreeOptions(
  value: unknown,
): SchemaTreeOptions | undefined {
  if (value === undefined) {
    return undefined;
  }

  const options = asRecord(value, "schemaTreeOptions");
  assertAllowedKeys(options, "schemaTreeOptions", ["includeInternalSchemas"]);
  asOptionalBoolean(
    options.includeInternalSchemas,
    "schemaTreeOptions.includeInternalSchemas",
  );
  return value as SchemaTreeOptions;
}

export function validateOpenDialogOptions(
  value: unknown,
): ConnectionFileDialogOptions {
  const options = asRecord(value, "openDialogOptions");
  assertAllowedKeys(options, "openDialogOptions", [
    "title",
    "defaultPath",
    "filters",
  ]);
  asString(options.title, "openDialogOptions.title");
  asOptionalString(options.defaultPath, "openDialogOptions.defaultPath", {
    maxLength: MAX_PATH_LENGTH,
    allowEmpty: true,
  });
  validateDialogFilters(options.filters, "openDialogOptions.filters");
  return value as ConnectionFileDialogOptions;
}

export function validateSettingsPatch(value: unknown): AppSettingsPatch {
  assertSerializedSize(value, "settingsPatch", 100_000);
  const patch = asRecord(value, "settingsPatch");
  assertAllowedKeys(patch, "settingsPatch", [
    "general",
    "appearance",
    "privacy",
  ]);

  if (patch.general !== undefined) {
    const general = asRecord(patch.general, "settingsPatch.general");
    assertAllowedKeys(general, "settingsPatch.general", [
      "readOnlyMode",
      "shellAccess",
      "enableDevTools",
      "hideInternalSchemas",
    ]);
    asOptionalBoolean(
      general.readOnlyMode,
      "settingsPatch.general.readOnlyMode",
    );
    asOptionalBoolean(general.shellAccess, "settingsPatch.general.shellAccess");
    asOptionalBoolean(
      general.enableDevTools,
      "settingsPatch.general.enableDevTools",
    );
    asOptionalBoolean(
      general.hideInternalSchemas,
      "settingsPatch.general.hideInternalSchemas",
    );
  }

  if (patch.appearance !== undefined) {
    const appearance = asRecord(patch.appearance, "settingsPatch.appearance");
    assertAllowedKeys(appearance, "settingsPatch.appearance", [
      "theme",
      "sidebarWidth",
      "density",
    ]);
    if (
      appearance.theme !== undefined &&
      appearance.theme !== "light" &&
      appearance.theme !== "dark" &&
      appearance.theme !== "system"
    ) {
      throw new TypeError("settingsPatch.appearance.theme is invalid.");
    }
    if (
      appearance.density !== undefined &&
      appearance.density !== "compact" &&
      appearance.density !== "comfortable"
    ) {
      throw new TypeError("settingsPatch.appearance.density is invalid.");
    }
    if (appearance.sidebarWidth !== undefined) {
      asInteger(
        appearance.sidebarWidth,
        "settingsPatch.appearance.sidebarWidth",
        240,
        4_096,
      );
    }
  }

  if (patch.privacy !== undefined) {
    const privacy = asRecord(patch.privacy, "settingsPatch.privacy");
    assertAllowedKeys(privacy, "settingsPatch.privacy", ["automaticUpdates"]);
    asOptionalBoolean(
      privacy.automaticUpdates,
      "settingsPatch.privacy.automaticUpdates",
    );
  }

  return value as AppSettingsPatch;
}

export function validateTableMetaParams(value: unknown): TableMetaParams {
  validateTableIdentity(value, "table");
  return value as TableMetaParams;
}

export function validateGetRowsParams(value: unknown): GetRowsParams {
  const params = validateTableIdentity(value, "getRows", [
    "page",
    "pageSize",
    "whereClause",
  ]);
  asInteger(params.page, "getRows.page", 1, 1_000_000);
  asInteger(params.pageSize, "getRows.pageSize", 1, 100);
  asOptionalString(params.whereClause, "getRows.whereClause", {
    maxLength: 100_000,
    allowEmpty: true,
  });
  return value as GetRowsParams;
}

export function validateExecuteQueryParams(value: unknown): ExecuteQueryParams {
  const params = asRecord(value, "executeQuery");
  assertAllowedKeys(params, "executeQuery", [
    "connectionId",
    "queryId",
    "sql",
    "page",
    "pageSize",
  ]);
  asString(params.connectionId, "executeQuery.connectionId");
  asString(params.queryId, "executeQuery.queryId", { maxLength: 128 });
  asString(params.sql, "executeQuery.sql", { maxLength: MAX_SQL_LENGTH });
  asInteger(params.page, "executeQuery.page", 1, 1_000_000);
  asInteger(params.pageSize, "executeQuery.pageSize", 1, 100);
  return value as ExecuteQueryParams;
}

export function validateCancelQueryParams(value: unknown): CancelQueryParams {
  const params = asRecord(value, "cancelQuery");
  assertAllowedKeys(params, "cancelQuery", ["connectionId", "queryId"]);
  asString(params.connectionId, "cancelQuery.connectionId");
  asString(params.queryId, "cancelQuery.queryId", { maxLength: 128 });
  return value as CancelQueryParams;
}

export function validateToggleTriggerParams(
  value: unknown,
): ToggleTriggerParams {
  const params = validateTableIdentity(value, "toggleTrigger", [
    "trigger",
    "enabled",
  ]);
  asString(params.trigger, "toggleTrigger.trigger");
  asBoolean(params.enabled, "toggleTrigger.enabled");
  return value as ToggleTriggerParams;
}

export function validateSaveDialogOptions(value: unknown): SaveDialogOptions {
  const options = asRecord(value, "saveDialogOptions");
  assertAllowedKeys(options, "saveDialogOptions", [
    "purpose",
    "title",
    "defaultPath",
    "filters",
  ]);
  if (options.purpose !== "export" && options.purpose !== "sql-dump") {
    throw new TypeError("saveDialogOptions.purpose is invalid.");
  }
  asOptionalString(options.title, "saveDialogOptions.title");
  asOptionalString(options.defaultPath, "saveDialogOptions.defaultPath", {
    maxLength: MAX_PATH_LENGTH,
    allowEmpty: true,
  });
  validateDialogFilters(options.filters, "saveDialogOptions.filters");
  return value as SaveDialogOptions;
}

export function validateExportDataParams(value: unknown): ExportDataParams {
  const params = asRecord(value, "exportData");
  assertAllowedKeys(params, "exportData", [
    "connectionId",
    "format",
    "filePath",
    "schema",
    "table",
    "sql",
  ]);
  asString(params.connectionId, "exportData.connectionId");
  asString(params.filePath, "exportData.filePath", {
    maxLength: MAX_PATH_LENGTH,
  });
  if (params.format !== "csv" && params.format !== "json") {
    throw new TypeError("exportData.format must be csv or json.");
  }

  const schema = asOptionalString(params.schema, "exportData.schema");
  const table = asOptionalString(params.table, "exportData.table");
  const sql = asOptionalString(params.sql, "exportData.sql", {
    maxLength: MAX_SQL_LENGTH,
  });
  const hasSql = sql !== undefined;
  const hasSchema = schema !== undefined;
  const hasTable = table !== undefined;
  const hasInvalidSource = hasSql
    ? hasSchema || hasTable
    : !hasSchema || !hasTable;
  if (hasInvalidSource) {
    throw new TypeError(
      "exportData must provide either sql or both schema and table.",
    );
  }

  return value as ExportDataParams;
}

export function validateSqlDumpParams(value: unknown): SqlDumpParams {
  const params = validateTableIdentity(value, "sqlDump", ["filePath"]);
  asString(params.filePath, "sqlDump.filePath", {
    maxLength: MAX_PATH_LENGTH,
  });
  return value as SqlDumpParams;
}

export function validateImportOpenDialogOptions(
  value: unknown,
): OpenDialogOptions {
  const options = asRecord(value, "openDialogOptions");
  assertAllowedKeys(options, "openDialogOptions", [
    "purpose",
    "title",
    "defaultPath",
    "filters",
  ]);
  if (options.purpose !== "import") {
    throw new TypeError("openDialogOptions.purpose is invalid.");
  }
  asOptionalString(options.title, "openDialogOptions.title");
  asOptionalString(options.defaultPath, "openDialogOptions.defaultPath", {
    maxLength: MAX_PATH_LENGTH,
    allowEmpty: true,
  });
  validateDialogFilters(options.filters, "openDialogOptions.filters");
  return value as OpenDialogOptions;
}

export function validateImportDataParams(value: unknown): ImportDataParams {
  const params = validateTableIdentity(value, "importData", [
    "filePath",
    "format",
    "operationId",
  ]);
  asString(params.filePath, "importData.filePath", {
    maxLength: MAX_PATH_LENGTH,
  });
  if (params.format !== "csv" && params.format !== "json") {
    throw new TypeError("importData.format must be csv or json.");
  }
  asString(params.operationId, "importData.operationId", { maxLength: 100 });
  return value as ImportDataParams;
}

export function validateInsertRowParams(value: unknown): InsertRowParams {
  assertSerializedSize(value, "insertRow");
  const params = asRecord(value, "insertRow");
  assertAllowedKeys(params, "insertRow", [
    "connectionId",
    "schema",
    "table",
    "changes",
  ]);
  asString(params.connectionId, "insertRow.connectionId");
  asString(params.schema, "insertRow.schema");
  asString(params.table, "insertRow.table");
  if (!Array.isArray(params.changes) || params.changes.length > 1_600) {
    throw new TypeError("insertRow.changes must contain at most 1600 changes.");
  }
  params.changes.forEach((change, index) => {
    const record = asRecord(change, `insertRow.changes[${index}]`);
    assertAllowedKeys(record, `insertRow.changes[${index}]`, [
      "column",
      "pgCast",
      "newValue",
      "setNull",
    ]);
    asString(record.column, `insertRow.changes[${index}].column`);
    asString(record.pgCast, `insertRow.changes[${index}].pgCast`);
    asBoolean(record.setNull, `insertRow.changes[${index}].setNull`);
  });
  return value as InsertRowParams;
}

function validateRowIdentity(
  record: UnknownRecord,
  name: string,
  extraKeys: readonly string[],
): void {
  assertAllowedKeys(record, name, [
    "connectionId",
    "schema",
    "table",
    "pkColumns",
    "pkValues",
    ...extraKeys,
  ]);
  asString(record.connectionId, `${name}.connectionId`);
  asString(record.schema, `${name}.schema`);
  asString(record.table, `${name}.table`);
  const pkColumns = validateStringArray(record.pkColumns, `${name}.pkColumns`);
  if (pkColumns.length === 0) {
    throw new TypeError(`${name}.pkColumns must not be empty.`);
  }
  if (
    !Array.isArray(record.pkValues) ||
    record.pkValues.length !== pkColumns.length
  ) {
    throw new TypeError(`${name}.pkValues must match ${name}.pkColumns.`);
  }
}

export function validateUpdateCellParams(value: unknown): UpdateCellParams {
  assertSerializedSize(value, "updateCell");
  const params = asRecord(value, "updateCell");
  validateRowIdentity(params, "updateCell", [
    "column",
    "pgCast",
    "newValue",
    "setNull",
  ]);
  asString(params.column, "updateCell.column");
  asString(params.pgCast, "updateCell.pgCast");
  asBoolean(params.setNull, "updateCell.setNull");
  return value as UpdateCellParams;
}

export function validateUpdateRowParams(value: unknown): UpdateRowParams {
  assertSerializedSize(value, "updateRow");
  const params = asRecord(value, "updateRow");
  validateRowIdentity(params, "updateRow", ["changes"]);
  if (
    !Array.isArray(params.changes) ||
    params.changes.length === 0 ||
    params.changes.length > 128
  ) {
    throw new TypeError("updateRow.changes must contain 1 to 128 changes.");
  }
  params.changes.forEach((change, index) => {
    const record = asRecord(change, `updateRow.changes[${index}]`);
    assertAllowedKeys(record, `updateRow.changes[${index}]`, [
      "column",
      "pgCast",
      "newValue",
      "setNull",
    ]);
    asString(record.column, `updateRow.changes[${index}].column`);
    asString(record.pgCast, `updateRow.changes[${index}].pgCast`);
    asBoolean(record.setNull, `updateRow.changes[${index}].setNull`);
  });
  return value as UpdateRowParams;
}

export function validateDeleteRowsParams(value: unknown): DeleteRowsParams {
  const params = validateTableIdentity(value, "deleteRows", ["whereClause"]);
  asOptionalString(params.whereClause, "deleteRows.whereClause", {
    maxLength: 100_000,
    allowEmpty: true,
  });
  return value as DeleteRowsParams;
}

export function validateSearchForeignKeyParams(
  value: unknown,
): SearchForeignKeyParams {
  const params = validateTableIdentity(value, "searchForeignKey", [
    "valueColumn",
    "labelColumn",
    "query",
    "limit",
  ]);
  asString(params.valueColumn, "searchForeignKey.valueColumn");
  if (params.labelColumn !== null) {
    asString(params.labelColumn, "searchForeignKey.labelColumn");
  }
  asString(params.query, "searchForeignKey.query", {
    maxLength: 1_000,
    allowEmpty: true,
  });
  asInteger(params.limit, "searchForeignKey.limit", 1, 200);
  return value as SearchForeignKeyParams;
}
