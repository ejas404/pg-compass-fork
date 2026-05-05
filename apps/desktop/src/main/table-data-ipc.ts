import path from "node:path";
import { ipcMain, dialog, BrowserWindow } from "electron";
import { TableDataChannels } from "../shared/types/table-data";
import type {
  DeleteRowsParams,
  ExecuteQueryParams,
  ExportDataParams,
  GetRowsParams,
  SqlDumpParams,
  TableMetaParams,
  ToggleTriggerParams,
  UpdateCellParams,
  UpdateRowParams,
  SearchForeignKeyParams,
} from "../shared/types/table-data";
import { executeQuery, getRows } from "./table-data-rows";
import {
  getConstraints,
  getIndexes,
  getStructure,
  getTriggers,
  getTypes,
  toggleTrigger,
} from "./table-data-meta";
import { exportData, sqlDump } from "./table-data-export";
import { deleteRows, updateCell, updateRow } from "./table-data-write";
import { searchForeignKey } from "./table-data-fk";

function resolveTestSaveDialogPath(
  options: Electron.SaveDialogOptions,
): string | null {
  const explicitPath = process.env.PG_COMPASS_TEST_SAVE_DIALOG_PATH?.trim();
  if (explicitPath) {
    return explicitPath;
  }

  const saveDir = process.env.PG_COMPASS_TEST_SAVE_DIALOG_DIR?.trim();
  if (!saveDir) {
    return null;
  }

  const fallbackName = options.defaultPath ?? "export.txt";
  return path.resolve(saveDir, path.basename(fallbackName));
}

// ---------------------------------------------------------------------------
// Handler registration
// ---------------------------------------------------------------------------

export function registerTableDataHandlers(): void {
  ipcMain.handle(
    TableDataChannels.GET_ROWS,
    async (_event, params: GetRowsParams) => {
      try {
        const data = await getRows(params);
        return { success: true, data };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },
  );

  ipcMain.handle(
    TableDataChannels.GET_STRUCTURE,
    async (_event, params: TableMetaParams) => {
      try {
        const data = await getStructure(params);
        return { success: true, data };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },
  );

  ipcMain.handle(
    TableDataChannels.GET_INDEXES,
    async (_event, params: TableMetaParams) => {
      try {
        const data = await getIndexes(params);
        return { success: true, data };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },
  );

  ipcMain.handle(
    TableDataChannels.GET_CONSTRAINTS,
    async (_event, params: TableMetaParams) => {
      try {
        const data = await getConstraints(params);
        return { success: true, data };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },
  );

  ipcMain.handle(
    TableDataChannels.GET_TRIGGERS,
    async (_event, params: TableMetaParams) => {
      try {
        const data = await getTriggers(params);
        return { success: true, data };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },
  );

  ipcMain.handle(
    TableDataChannels.GET_TYPES,
    async (_event, params: TableMetaParams) => {
      try {
        const data = await getTypes(params);
        return { success: true, data };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },
  );

  ipcMain.handle(
    TableDataChannels.TOGGLE_TRIGGER,
    async (_event, params: ToggleTriggerParams) => {
      try {
        const data = await toggleTrigger(params);
        return { success: true, data };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },
  );

  ipcMain.handle(
    TableDataChannels.EXECUTE_QUERY,
    async (_event, params: ExecuteQueryParams) => {
      try {
        const data = await executeQuery(params);
        return { success: true, data };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },
  );

  ipcMain.handle(
    TableDataChannels.SHOW_SAVE_DIALOG,
    async (event, options: Electron.SaveDialogOptions) => {
      try {
        const testFilePath = resolveTestSaveDialogPath(options);
        if (testFilePath) {
          return { success: true, data: testFilePath };
        }

        const win = BrowserWindow.fromWebContents(event.sender);
        const result = win
          ? await dialog.showSaveDialog(win, options)
          : await dialog.showSaveDialog(options);
        if (result.canceled || !result.filePath)
          return { success: true, data: null };
        return { success: true, data: result.filePath };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },
  );

  ipcMain.handle(
    TableDataChannels.EXPORT_DATA,
    async (event, params: ExportDataParams) => {
      try {
        const data = await exportData(params, event.sender);
        return { success: true, data };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },
  );

  ipcMain.handle(
    TableDataChannels.SQL_DUMP,
    async (event, params: SqlDumpParams) => {
      try {
        const data = await sqlDump(params, event.sender);
        return { success: true, data };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },
  );

  ipcMain.handle(
    TableDataChannels.UPDATE_CELL,
    async (_event, params: UpdateCellParams) => {
      try {
        const data = await updateCell(params);
        return { success: true, data };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },
  );

  ipcMain.handle(
    TableDataChannels.UPDATE_ROW,
    async (_event, params: UpdateRowParams) => {
      try {
        const data = await updateRow(params);
        return { success: true, data };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },
  );

  ipcMain.handle(
    TableDataChannels.DELETE_ROWS,
    async (_event, params: DeleteRowsParams) => {
      try {
        const data = await deleteRows(params);
        return { success: true, data };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },
  );

  ipcMain.handle(
    TableDataChannels.SEARCH_FK,
    async (_event, params: SearchForeignKeyParams) => {
      try {
        const data = await searchForeignKey(params);
        return { success: true, data };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },
  );
}
