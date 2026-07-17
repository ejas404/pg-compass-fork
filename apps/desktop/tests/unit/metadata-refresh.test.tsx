import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StructureTab } from "@/components/workspace/table-viewer/structure-tab";
import { IndexesTab } from "@/components/workspace/table-viewer/indexes-tab";
import { ConstraintsTab } from "@/components/workspace/table-viewer/constraints-tab";
import { TriggersTab } from "@/components/workspace/table-viewer/triggers-tab";
import { TypesTab } from "@/components/workspace/table-viewer/types-tab";

vi.mock("@/hooks/use-settings", () => ({
  useSettings: () => ({
    settings: { general: { readOnlyMode: true } },
  }),
}));

const cases = [
  ["structure", StructureTab, "getStructure"],
  ["indexes", IndexesTab, "getIndexes"],
  ["constraints", ConstraintsTab, "getConstraints"],
  ["triggers", TriggersTab, "getTriggers"],
  ["types", TypesTab, "getTypes"],
] as const;

describe("metadata tab refresh signals", () => {
  beforeEach(() => {
    Object.assign(window, {
      tableDataApi: {
        getStructure: vi.fn().mockResolvedValue({ success: true, data: [] }),
        getIndexes: vi.fn().mockResolvedValue({ success: true, data: [] }),
        getConstraints: vi.fn().mockResolvedValue({ success: true, data: [] }),
        getTriggers: vi.fn().mockResolvedValue({ success: true, data: [] }),
        getTypes: vi.fn().mockResolvedValue({ success: true, data: [] }),
      },
    });
  });

  it.each(cases)("re-runs the %s loader", async (_label, Component, method) => {
    const onRefreshComplete = vi.fn();
    const view = render(
      <Component
        connectionId="conn-1"
        schema="app"
        table="users"
        refreshSignal={0}
        onRefreshComplete={onRefreshComplete}
      />,
    );
    await waitFor(() =>
      expect(window.tableDataApi[method]).toHaveBeenCalledTimes(1),
    );

    view.rerender(
      <Component
        connectionId="conn-1"
        schema="app"
        table="users"
        refreshSignal={1}
        onRefreshComplete={onRefreshComplete}
      />,
    );
    await waitFor(() =>
      expect(window.tableDataApi[method]).toHaveBeenCalledTimes(2),
    );
    expect(onRefreshComplete).toHaveBeenCalledWith(true);
  });
});
