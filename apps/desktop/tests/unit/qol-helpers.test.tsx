import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  isCopyableValue,
  serializeCellValue,
  serializeRow,
} from "@/components/workspace/table-viewer/data-copy";
import {
  DateTimeEditor,
  isDateTimeType,
} from "@/components/workspace/renderers/date-time-editor";
import { filterConnectionTree } from "@/components/sidebar/sidebar-content";
import { matchesShortcut, shortcutLabel } from "@/shared/constants/shortcuts";
import type {
  ConnectionConfig,
  DatabaseSchema,
} from "@/shared/types/connection";

const connection: ConnectionConfig = {
  id: "conn-1",
  label: "Production",
  favourite: false,
  mode: "uri",
  uri: "postgresql://localhost/app",
};

const schemas: DatabaseSchema[] = [
  {
    name: "app",
    tables: ["users", "audit_log"],
    views: [{ name: "active_users", definition: null }],
  },
];

describe("QOL helpers", () => {
  it("filters sidebar branches by schema and relation names case-insensitively", () => {
    expect(
      filterConnectionTree(connection, schemas, "AUDIT").schemas[0]?.tables,
    ).toEqual(["audit_log"]);
    expect(
      filterConnectionTree(connection, schemas, "active").schemas[0]?.views,
    ).toHaveLength(1);
    expect(
      filterConnectionTree(connection, schemas, "production").schemas,
    ).toEqual(schemas);
    expect(filterConnectionTree(connection, schemas, "missing").matches).toBe(
      false,
    );
  });

  it("serializes cells and rows predictably while omitting unavailable values", () => {
    expect(serializeCellValue({ enabled: true })).toBe('{"enabled":true}');
    expect(serializeCellValue([1, 2])).toBe("[1,2]");
    expect(serializeCellValue(null)).toBe("NULL");
    expect(isCopyableValue("[masked]")).toBe(false);
    expect(
      serializeRow(
        [
          { name: "id", dataType: "int4", dataTypeId: 23 },
          { name: "secret", dataType: "text", dataTypeId: 25 },
        ],
        { id: 1, secret: "[masked]" },
      ),
    ).toBe('{"id":1}');
  });

  it("renders picker-first timestamptz editing with a raw ISO escape hatch", () => {
    const onChange = vi.fn();
    render(
      <TooltipProvider>
        <DateTimeEditor
          pgType="timestamptz"
          value="2026-07-17T12:30:00Z"
          onChange={onChange}
        />
      </TooltipProvider>,
    );

    expect(isDateTimeType("timestamptz")).toBe(true);
    expect(screen.getByLabelText("Timezone offset")).toHaveValue("Z");
    fireEvent.click(screen.getByRole("button", { name: "Raw" }));
    expect(screen.getByLabelText("Raw date or time value")).toHaveValue(
      "2026-07-17T12:30:00Z",
    );
  });

  it("formats platform shortcut labels from the shared definitions", () => {
    const shortcut = {
      id: "test",
      label: "Test",
      category: "Workspace" as const,
      binding: { key: "k", modifier: "mod" as const },
      keys: { mac: ["⌘", "K"], windows: ["Ctrl", "K"] },
    };
    expect(shortcutLabel(shortcut, "mac")).toBe("⌘K");
    expect(shortcutLabel(shortcut, "windows")).toBe("Ctrl+K");
    expect(
      matchesShortcut(
        "sidebar-search",
        { key: "f", ctrlKey: true, metaKey: false, shiftKey: true },
        "windows",
      ),
    ).toBe(true);
  });
});
