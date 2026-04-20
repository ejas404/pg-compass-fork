import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceProvider, useWorkspace } from "@/hooks/use-workspace";
import { ConnectionProvider } from "@/hooks/use-connections";
import { SettingsProvider } from "@/hooks/use-settings";
import { DEFAULT_APP_SETTINGS } from "@/shared/types/settings";

function Wrapper({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <SettingsProvider>
      <ConnectionProvider>
        <WorkspaceProvider>{children}</WorkspaceProvider>
      </ConnectionProvider>
    </SettingsProvider>
  );
}

describe("useWorkspace", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );

    Object.assign(window, {
      settingsApi: {
        get: vi.fn().mockResolvedValue({
          success: true,
          data: DEFAULT_APP_SETTINGS,
        }),
        update: vi.fn(),
      },
      connectionApi: {
        getAll: vi.fn().mockResolvedValue({ success: true, data: [] }),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        toggleFavourite: vi.fn(),
        test: vi.fn(),
        getSchemaTree: vi.fn().mockResolvedValue({
          success: true,
          data: [{ name: "app", tables: ["users"] }],
        }),
      },
    });
  });

  it("opens tabs, caches schemas, and reuses existing tabs", async () => {
    const { result } = renderHook(() => useWorkspace(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.tabs).toHaveLength(0));

    await act(async () => {
      await result.current.openTab({
        type: "schema",
        path: {
          connectionId: "conn-1",
          connectionLabel: "Local",
          schemaName: "app",
        },
      });

      await result.current.openTab({
        type: "schema",
        path: {
          connectionId: "conn-1",
          connectionLabel: "Local",
          schemaName: "app",
        },
      });
    });

    await waitFor(() => expect(result.current.tabs).toHaveLength(1));
    expect(result.current.schemaCache["conn-1"]).toHaveLength(1);
  });
});
