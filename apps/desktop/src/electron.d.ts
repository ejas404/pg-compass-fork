import type {
  ClipboardApi,
  ConnectionApi,
  HelpApi,
  SettingsApi,
  TableDataApi,
  WorkspaceApi,
} from "./shared/types/ipc";

declare global {
  interface Window {
    connectionApi: ConnectionApi;
    settingsApi: SettingsApi;
    tableDataApi: TableDataApi;
    helpApi: HelpApi;
    workspaceApi: WorkspaceApi;
    clipboardApi: ClipboardApi;
  }
}
