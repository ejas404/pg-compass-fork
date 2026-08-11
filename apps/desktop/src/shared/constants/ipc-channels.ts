export const ConnectionChannels = {
  GET_ALL: "connections:get-all",
  GET_BY_ID: "connections:get-by-id",
  CREATE: "connections:create",
  UPDATE: "connections:update",
  DELETE: "connections:delete",
  TOGGLE_FAVOURITE: "connections:toggle-favourite",
  TEST: "connections:test",
  GET_SCHEMA_TREE: "connections:get-schema-tree",
  SHOW_OPEN_FILE_DIALOG: "connections:show-open-file-dialog",
} as const;

export const SettingsChannels = {
  GET: "settings:get",
  UPDATE: "settings:update",
} as const;

export const TableDataChannels = {
  GET_ROWS: "table-data:get-rows",
  GET_STRUCTURE: "table-data:get-structure",
  GET_INDEXES: "table-data:get-indexes",
  GET_CONSTRAINTS: "table-data:get-constraints",
  GET_TRIGGERS: "table-data:get-triggers",
  GET_TYPES: "table-data:get-types",
  TOGGLE_TRIGGER: "table-data:toggle-trigger",
  EXECUTE_QUERY: "table-data:execute-query",
  CANCEL_QUERY: "table-data:cancel-query",
  SHOW_SAVE_DIALOG: "table-data:show-save-dialog",
  SHOW_OPEN_DIALOG: "table-data:show-open-dialog",
  EXPORT_DATA: "table-data:export-data",
  EXPORT_PROGRESS: "table-data:export-progress",
  SQL_DUMP: "table-data:sql-dump",
  IMPORT_DATA: "table-data:import-data",
  IMPORT_PROGRESS: "table-data:import-progress",
  INSERT_ROW: "table-data:insert-row",
  UPDATE_CELL: "table-data:update-cell",
  UPDATE_ROW: "table-data:update-row",
  DELETE_ROWS: "table-data:delete-rows",
  SEARCH_FK: "table-data:search-fk",
} as const;

export const HelpChannels = {
  SHOW_LICENSE: "help:show-license",
  SHOW_ABOUT: "help:show-about",
  SHOW_SHORTCUTS: "help:show-shortcuts",
} as const;

export const WorkspaceChannels = {
  CLOSE_TAB: "workspace:close-tab",
  NEXT_TAB: "workspace:next-tab",
  PREV_TAB: "workspace:prev-tab",
} as const;

export const ClipboardChannels = {
  WRITE_TEXT: "clipboard:write-text",
} as const;
