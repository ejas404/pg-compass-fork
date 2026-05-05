import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { RowEditDialog } from "@/components/workspace/table-viewer/row-edit-dialog";
import { registerDefaultRenderers } from "@/components/workspace/renderers/default-renderers";
import { registerDefaultEditors } from "@/components/workspace/renderers/edit-registry";
import type { ColumnInfo } from "@/shared/types/table-data";

beforeAll(() => {
  try {
    registerDefaultRenderers();
  } catch {
    /* idempotent */
  }
  try {
    registerDefaultEditors();
  } catch {
    /* idempotent */
  }
});

const columns: ColumnInfo[] = [
  { name: "id", dataTypeId: 23, dataType: "int4" },
  { name: "display_name", dataTypeId: 1043, dataType: "varchar" },
  { name: "login_count", dataTypeId: 23, dataType: "int4" },
  { name: "profile_note", dataTypeId: 25, dataType: "text" },
];

const row = {
  id: 1,
  display_name: "Alice",
  login_count: 5,
  profile_note: "hi",
};

interface UpdateRowMock {
  fn: ReturnType<typeof vi.fn>;
}

function setupUpdateRowMock(
  impl: (params: unknown) => unknown = () => ({
    success: true,
    data: { row: { ...row, display_name: "Alice 2" } },
  }),
): UpdateRowMock {
  const fn = vi.fn(async (params: unknown) => impl(params));
  Object.defineProperty(globalThis.window, "tableDataApi", {
    configurable: true,
    value: { updateRow: fn },
  });
  return { fn };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("RowEditDialog", () => {
  it("renders one editor per non-PK column; PK is read-only", () => {
    setupUpdateRowMock();
    render(
      <RowEditDialog
        columns={columns}
        row={row}
        primaryKey={["id"]}
        pkValues={[1]}
        schema="app"
        table="users"
        connectionId="c1"
        onRowUpdated={() => {}}
        onClose={() => {}}
      />,
    );
    // Save disabled when no changes.
    expect(screen.getByTestId("row-editor-save")).toBeDisabled();
    // Each non-PK column gets a field.
    expect(screen.getByTestId("row-field-display_name")).toBeInTheDocument();
    expect(screen.getByTestId("row-field-login_count")).toBeInTheDocument();
    // PK column is rendered but not as an editable input.
    expect(screen.getByTestId("row-field-id")).toBeInTheDocument();
    expect(screen.queryByTestId("setnull-id")).toBeNull();
    expect(screen.queryByTestId("revert-id")).toBeNull();
  });

  it("enables Save once a field changes; saves with both edits in one call", async () => {
    const { fn } = setupUpdateRowMock();
    const onRowUpdated = vi.fn();
    render(
      <RowEditDialog
        columns={columns}
        row={row}
        primaryKey={["id"]}
        pkValues={[1]}
        schema="app"
        table="users"
        connectionId="c1"
        onRowUpdated={onRowUpdated}
        onClose={() => {}}
      />,
    );

    const nameField = screen.getByTestId("row-field-display_name").querySelector(
      "input",
    )!;
    fireEvent.change(nameField, { target: { value: "Alice 2" } });

    const countField = screen.getByTestId("row-field-login_count").querySelector(
      "input",
    )!;
    fireEvent.change(countField, { target: { value: "9" } });

    const save = screen.getByTestId("row-editor-save");
    expect(save).not.toBeDisabled();
    fireEvent.click(save);

    await waitFor(() => expect(fn).toHaveBeenCalledTimes(1));
    expect(fn).toHaveBeenCalledWith({
      connectionId: "c1",
      schema: "app",
      table: "users",
      pkColumns: ["id"],
      pkValues: [1],
      changes: [
        { column: "display_name", pgCast: "varchar", newValue: "Alice 2", setNull: false },
        { column: "login_count", pgCast: "int4", newValue: 9, setNull: false },
      ],
    });
    await waitFor(() => expect(onRowUpdated).toHaveBeenCalled());
  });

  it("revert clears one field's draft without affecting the other", () => {
    setupUpdateRowMock();
    render(
      <RowEditDialog
        columns={columns}
        row={row}
        primaryKey={["id"]}
        pkValues={[1]}
        schema="app"
        table="users"
        connectionId="c1"
        onRowUpdated={() => {}}
        onClose={() => {}}
      />,
    );
    const nameInput = screen.getByTestId("row-field-display_name").querySelector(
      "input",
    )! as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "Renamed" } });
    const countInput = screen.getByTestId("row-field-login_count").querySelector(
      "input",
    )! as HTMLInputElement;
    fireEvent.change(countInput, { target: { value: "9" } });

    expect(screen.getByTestId("row-field-display_name").getAttribute("data-changed")).toBe(
      "true",
    );

    fireEvent.click(screen.getByTestId("revert-display_name"));

    expect(
      (screen.getByTestId("row-field-display_name").querySelector("input")! as HTMLInputElement)
        .value,
    ).toBe("Alice");
    expect(screen.getByTestId("row-field-display_name").getAttribute("data-changed")).toBe(
      "false",
    );
    expect(screen.getByTestId("row-field-login_count").getAttribute("data-changed")).toBe(
      "true",
    );
  });

  it("Set NULL replaces the input with a NULL pill and sends setNull: true", async () => {
    const { fn } = setupUpdateRowMock();
    render(
      <RowEditDialog
        columns={columns}
        row={row}
        primaryKey={["id"]}
        pkValues={[1]}
        schema="app"
        table="users"
        connectionId="c1"
        onRowUpdated={() => {}}
        onClose={() => {}}
      />,
    );

    fireEvent.click(screen.getByTestId("setnull-profile_note"));
    expect(screen.getByTestId("null-pill-profile_note")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("row-editor-save"));
    await waitFor(() => expect(fn).toHaveBeenCalledTimes(1));
    const call = fn.mock.calls[0]![0] as { changes: unknown[] };
    expect(call.changes).toEqual([
      { column: "profile_note", pgCast: "text", newValue: null, setNull: true },
    ]);
  });

  it("surfaces validation errors and blocks save when an integer field is invalid", async () => {
    const { fn } = setupUpdateRowMock();
    render(
      <RowEditDialog
        columns={columns}
        row={row}
        primaryKey={["id"]}
        pkValues={[1]}
        schema="app"
        table="users"
        connectionId="c1"
        onRowUpdated={() => {}}
        onClose={() => {}}
      />,
    );
    const countInput = screen.getByTestId("row-field-login_count").querySelector(
      "input",
    )!;
    fireEvent.change(countInput, { target: { value: "not-a-number" } });
    fireEvent.click(screen.getByTestId("row-editor-save"));
    expect(fn).not.toHaveBeenCalled();
    expect(
      screen.getByTestId("row-field-login_count").textContent,
    ).toMatch(/not a valid int4/i);
  });

  it("Cancel closes immediately when there are no changes", () => {
    setupUpdateRowMock();
    const onClose = vi.fn();
    render(
      <RowEditDialog
        columns={columns}
        row={row}
        primaryKey={["id"]}
        pkValues={[1]}
        schema="app"
        table="users"
        connectionId="c1"
        onRowUpdated={() => {}}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalled();
  });

  it("Cancel asks for confirm when there are pending changes", () => {
    setupUpdateRowMock();
    const onClose = vi.fn();
    render(
      <RowEditDialog
        columns={columns}
        row={row}
        primaryKey={["id"]}
        pkValues={[1]}
        schema="app"
        table="users"
        connectionId="c1"
        onRowUpdated={() => {}}
        onClose={onClose}
      />,
    );
    const nameInput = screen.getByTestId("row-field-display_name").querySelector(
      "input",
    )!;
    fireEvent.change(nameInput, { target: { value: "Renamed" } });

    const confirmSpy = vi
      .spyOn(globalThis.window, "confirm")
      .mockReturnValueOnce(false);
    fireEvent.click(screen.getByText("Cancel"));
    expect(confirmSpy).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();

    confirmSpy.mockReturnValueOnce(true);
    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalled();
  });
});
