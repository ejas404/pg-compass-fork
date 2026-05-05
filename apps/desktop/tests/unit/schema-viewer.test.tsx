import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SchemaViewer } from "@/components/workspace/schema-viewer";

const openTab = vi.fn().mockResolvedValue(undefined);
const navigateToView = vi.fn().mockResolvedValue(undefined);
const refreshSchemaTree = vi.fn().mockResolvedValue([]);

vi.mock("@/hooks/use-workspace", () => ({
  useWorkspace: () => ({
    schemaCache: {
      "conn-1": [
        {
          name: "app",
          tables: ["users"],
          views: [
            {
              name: "active_users",
              definition:
                "SELECT id, email, display_name FROM app.users WHERE status = 'active'",
            },
          ],
          tableStats: {
            users: { estimatedRowCount: 120, sizeOnDisk: "64 kB" },
          },
        },
      ],
    },
    refreshSchemaTree,
    openTab,
    navigateToView,
  }),
}));

describe("SchemaViewer", () => {
  it("lists views from the schema cache and opens the selected view", async () => {
    const user = userEvent.setup();

    render(
      <SchemaViewer
        path={{
          connectionId: "conn-1",
          connectionLabel: "Local",
          schemaName: "app",
        }}
      />,
    );

    await user.click(screen.getByRole("tab", { name: "Views" }));

    expect(screen.getByText("active_users")).toBeInTheDocument();
    expect(screen.getByText(/FROM app\.users/)).toBeInTheDocument();

    await user.click(screen.getByText("active_users"));

    expect(openTab).toHaveBeenCalledWith({
      type: "view-details",
      path: {
        connectionId: "conn-1",
        connectionLabel: "Local",
        schemaName: "app",
        viewName: "active_users",
      },
    });
  });
});
