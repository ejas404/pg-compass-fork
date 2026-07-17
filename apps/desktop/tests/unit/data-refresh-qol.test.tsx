import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DataTab } from "@/components/workspace/table-viewer/data-tab";

vi.mock("@/hooks/use-workspace", () => ({
  useWorkspace: () => ({ schemaCache: {} }),
}));
vi.mock("@/hooks/use-settings", () => ({
  useSettings: () => ({
    settings: { general: { readOnlyMode: true } },
  }),
}));
vi.mock("@/components/sql-editor/SqlEditor", () => ({
  SqlEditor: () => <div />,
}));
vi.mock("@/components/workspace/export-dropdown", () => ({
  ExportDropdown: () => null,
}));
vi.mock("@/components/workspace/table-viewer/table-data-view", () => ({
  TableDataView: ({ rows }: { rows: unknown[] }) => (
    <div>visible rows: {rows.length}</div>
  ),
}));
vi.mock("@/components/workspace/table-viewer/card-data-view", () => ({
  CardDataView: () => null,
}));
vi.mock("@/components/workspace/table-viewer/delete-data-dialog", () => ({
  DeleteDataDialog: () => null,
}));

describe("DataTab background refresh", () => {
  beforeEach(() => {
    Object.assign(window, {
      tableDataApi: {
        getRows: vi
          .fn()
          .mockResolvedValueOnce({
            success: true,
            data: {
              columns: [{ name: "id", dataType: "int4", dataTypeId: 23 }],
              rows: [{ id: 1 }],
              totalCount: 1,
              primaryKey: ["id"],
            },
          })
          .mockResolvedValueOnce({
            success: false,
            error: "connection dropped",
          }),
      },
    });
  });

  it("keeps the last successful rows visible when refresh fails", async () => {
    const onRefreshComplete = vi.fn();
    const view = render(
      <DataTab
        connectionId="conn-1"
        schema="app"
        table="users"
        relationType="table"
        refreshSignal={0}
        onRefreshComplete={onRefreshComplete}
      />,
    );
    await screen.findByText("visible rows: 1");

    view.rerender(
      <DataTab
        connectionId="conn-1"
        schema="app"
        table="users"
        relationType="table"
        refreshSignal={1}
        onRefreshComplete={onRefreshComplete}
      />,
    );

    await waitFor(() => expect(onRefreshComplete).toHaveBeenCalledWith(false));
    expect(screen.getByText("visible rows: 1")).toBeVisible();
    expect(
      screen.getByText(/Showing the last successful result/),
    ).toBeVisible();
  });
});
