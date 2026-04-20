import { beforeEach, describe, expect, it, vi } from "vitest";

const invoke = vi.fn();
const on = vi.fn();
const removeListener = vi.fn();
const exposeInMainWorld = vi.fn();

vi.mock("electron", () => ({
  contextBridge: { exposeInMainWorld },
  ipcRenderer: {
    invoke,
    on,
    removeListener,
  },
}));

describe("preload API contract", () => {
  beforeEach(() => {
    vi.resetModules();
    invoke.mockReset();
    on.mockReset();
    removeListener.mockReset();
    exposeInMainWorld.mockReset();
  });

  it("exposes the expected APIs and forwards invoke/on calls", async () => {
    await import("@/preload");

    const exposed = Object.fromEntries(
      exposeInMainWorld.mock.calls.map(([key, value]) => [key, value]),
    ) as {
      connectionApi: {
        getAll: () => Promise<unknown>;
      };
      tableDataApi: {
        onExportProgress: (callback: () => void) => () => void;
        updateCell: (params: unknown) => Promise<unknown>;
      };
    };

    await exposed.connectionApi.getAll();
    expect(invoke).toHaveBeenCalledWith("connections:get-all");

    const cleanup = exposed.tableDataApi.onExportProgress(vi.fn());
    expect(on).toHaveBeenCalledWith(
      "table-data:export-progress",
      expect.any(Function),
    );

    cleanup();
    expect(removeListener).toHaveBeenCalledWith(
      "table-data:export-progress",
      expect.any(Function),
    );

    // Write path: updateCell forwards to the UPDATE_CELL channel.
    const updateParams = {
      connectionId: "c1",
      schema: "app",
      table: "users",
      pkColumns: ["id"],
      pkValues: [1],
      column: "display_name",
      pgCast: "text",
      newValue: "new",
      setNull: false,
    };
    await exposed.tableDataApi.updateCell(updateParams);
    expect(invoke).toHaveBeenCalledWith("table-data:update-cell", updateParams);
  });
});
