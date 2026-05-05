import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ForeignKeyPicker,
  ForeignKeyModalEditor,
} from "@/components/workspace/renderers/foreign-key-editor";
import type { ForeignKeyRef } from "@/shared/types/table-data";

const fk: ForeignKeyRef = {
  schema: "app",
  table: "users",
  column: "id",
  labelColumn: "display_name",
  valuePgCast: "int4",
};

function setupSearchMock(
  responses: Record<string, { options: { value: unknown; label: string | null }[]; hasMore: boolean }>,
): { fn: ReturnType<typeof vi.fn>; calls: { params: unknown }[] } {
  const calls: { params: unknown }[] = [];
  const fn = vi.fn(async (params: { query: string }) => {
    calls.push({ params });
    const data = responses[params.query] ?? { options: [], hasMore: false };
    return { success: true, data };
  });
  Object.defineProperty(globalThis.window, "tableDataApi", {
    configurable: true,
    value: { searchForeignKey: fn },
  });
  return { fn, calls };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function advanceSearchDebounce(): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(250);
  });
}

describe("ForeignKeyPicker", () => {
  it("debounces the initial search and renders results", async () => {
    const { fn } = setupSearchMock({
      "": {
        options: [
          { value: 1, label: "Alice" },
          { value: 2, label: "Bob" },
        ],
        hasMore: false,
      },
    });

    render(
      <ForeignKeyPicker
        currentValue={null}
        foreignKey={fk}
        connectionId="c1"
        allowNull
        onPick={() => {}}
      />,
    );

    expect(fn).not.toHaveBeenCalled();
    await advanceSearchDebounce();
    expect(fn).toHaveBeenCalled();

    expect(screen.getByTestId("fk-option-1")).toBeInTheDocument();
    expect(screen.getByTestId("fk-option-2")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("calls onPick with the chosen value and label", async () => {
    setupSearchMock({
      "": {
        options: [{ value: 7, label: "Carol" }],
        hasMore: false,
      },
    });
    const onPick = vi.fn();

    render(
      <ForeignKeyPicker
        currentValue={null}
        foreignKey={fk}
        connectionId="c1"
        allowNull={false}
        onPick={onPick}
      />,
    );

    await advanceSearchDebounce();
    screen.getByTestId("fk-option-7");
    fireEvent.click(screen.getByTestId("fk-option-7"));
    expect(onPick).toHaveBeenCalledWith(7, "Carol");
  });

  it("shows the (NULL) option only when allowNull is true", async () => {
    setupSearchMock({ "": { options: [], hasMore: false } });

    const { rerender } = render(
      <ForeignKeyPicker
        currentValue={null}
        foreignKey={fk}
        connectionId="c1"
        allowNull
        onPick={() => {}}
        onSetNull={() => {}}
      />,
    );
    expect(screen.getByTestId("fk-option-null")).toBeInTheDocument();

    rerender(
      <ForeignKeyPicker
        currentValue={null}
        foreignKey={fk}
        connectionId="c1"
        allowNull={false}
        onPick={() => {}}
      />,
    );
    expect(screen.queryByTestId("fk-option-null")).toBeNull();
  });

  it("shows the hasMore footer when the server reports more rows", async () => {
    setupSearchMock({
      "": {
        options: [{ value: 1, label: "A" }],
        hasMore: true,
      },
    });

    render(
      <ForeignKeyPicker
        currentValue={null}
        foreignKey={fk}
        connectionId="c1"
        allowNull={false}
        onPick={() => {}}
      />,
    );
    await advanceSearchDebounce();
    expect(screen.getByText(/refine your search/i)).toBeInTheDocument();
  });

  it("debounces typing — only the latest query reaches the server", async () => {
    const { fn } = setupSearchMock({
      ali: {
        options: [{ value: 1, label: "Alice" }],
        hasMore: false,
      },
      "": { options: [], hasMore: false },
    });

    render(
      <ForeignKeyPicker
        currentValue={null}
        foreignKey={fk}
        connectionId="c1"
        allowNull={false}
        onPick={() => {}}
      />,
    );
    // First debounced call: empty.
    await advanceSearchDebounce();
    expect(fn).toHaveBeenCalledTimes(1);

    const input = screen.getByTestId("fk-search-input") as HTMLInputElement;
    act(() => {
      fireEvent.change(input, { target: { value: "a" } });
      fireEvent.change(input, { target: { value: "al" } });
      fireEvent.change(input, { target: { value: "ali" } });
    });

    // None of those individually fire a query yet — debounce in flight.
    expect(fn).toHaveBeenCalledTimes(1);

    await advanceSearchDebounce();
    expect(fn).toHaveBeenCalledTimes(2);
    const lastCall = fn.mock.calls[fn.mock.calls.length - 1]![0] as {
      query: string;
    };
    expect(lastCall.query).toBe("ali");
  });

  it("surfaces a server-side error inline", async () => {
    const fn = vi.fn(async () => ({ success: false, error: "boom" }));
    Object.defineProperty(globalThis.window, "tableDataApi", {
      configurable: true,
      value: { searchForeignKey: fn },
    });
    render(
      <ForeignKeyPicker
        currentValue={null}
        foreignKey={fk}
        connectionId="c1"
        allowNull={false}
        onPick={() => {}}
      />,
    );
    await advanceSearchDebounce();
    expect(screen.getByText("boom")).toBeInTheDocument();
  });
});

describe("ForeignKeyModalEditor", () => {
  it("emits an EditResult with the column's pgCast on pick", async () => {
    setupSearchMock({
      "": {
        options: [{ value: 99, label: "Zed" }],
        hasMore: false,
      },
    });
    const onSave = vi.fn();
    render(
      <ForeignKeyModalEditor
        initialValue={null}
        onSave={onSave}
        onCancel={() => {}}
        foreignKey={fk}
        connectionId="c1"
        allowNull
      />,
    );
    await advanceSearchDebounce();
    screen.getByTestId("fk-option-99");
    fireEvent.click(screen.getByTestId("fk-option-99"));
    expect(onSave).toHaveBeenCalledWith({ value: 99, pgCast: "int4" });
  });
});
