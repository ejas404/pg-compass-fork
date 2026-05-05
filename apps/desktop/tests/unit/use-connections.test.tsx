import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConnectionProvider, useConnections } from "@/hooks/use-connections";
import type { ConnectionConfig } from "@/shared/types/connection";

const baseConnection: ConnectionConfig = {
  id: "conn-1",
  label: "Local",
  favourite: false,
  mode: "fields",
  fields: {
    host: "localhost",
    port: 5432,
    database: "postgres",
    user: "postgres",
    password: "secret",
  },
};

describe("useConnections", () => {
  beforeEach(() => {
    Object.assign(window, {
      connectionApi: {
        getAll: vi.fn().mockResolvedValue({
          success: true,
          data: [baseConnection],
        }),
        create: vi.fn().mockResolvedValue({
          success: true,
          data: { ...baseConnection, id: "conn-2", label: "Created" },
        }),
        update: vi.fn().mockResolvedValue({
          success: true,
          data: { ...baseConnection, label: "Updated" },
        }),
        delete: vi.fn().mockResolvedValue({ success: true, data: true }),
        toggleFavourite: vi.fn().mockResolvedValue({
          success: true,
          data: { ...baseConnection, favourite: true },
        }),
        test: vi.fn().mockResolvedValue({ success: true, data: true }),
        getSchemaTree: vi.fn().mockResolvedValue({
          success: true,
          data: [{ name: "app", tables: ["users"], views: [] }],
        }),
      },
    });
  });

  it("loads connections and can create new ones", async () => {
    const { result } = renderHook(() => useConnections(), {
      wrapper: ConnectionProvider,
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.connections).toHaveLength(1);

    let created: ConnectionConfig | null = null;
    await act(async () => {
      created = await result.current.create({
        label: "Created",
        favourite: false,
        mode: "fields",
        fields: baseConnection.fields,
      });
    });

    expect((created as ConnectionConfig | null)?.label).toBe("Created");
  });
});
