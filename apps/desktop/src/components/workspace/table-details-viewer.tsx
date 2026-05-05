import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ViewerShell } from "@/components/workspace/viewer-shell";
import { DataTab } from "@/components/workspace/table-viewer/data-tab";
import { StructureTab } from "@/components/workspace/table-viewer/structure-tab";
import { IndexesTab } from "@/components/workspace/table-viewer/indexes-tab";
import { ConstraintsTab } from "@/components/workspace/table-viewer/constraints-tab";
import { TriggersTab } from "@/components/workspace/table-viewer/triggers-tab";
import { TypesTab } from "@/components/workspace/table-viewer/types-tab";
import { QueryTab } from "@/components/workspace/table-viewer/query-tab";
import { useWorkspace } from "@/hooks/use-workspace";
import type { TableListViewerPath } from "@/shared/types/workspace";

interface TableDetailsViewerProps {
  path: TableListViewerPath;
}

export function TableDetailsViewer({
  path,
}: Readonly<TableDetailsViewerProps>) {
  const { refreshSchemaTree, navigateToView } = useWorkspace();
  const [activeTab, setActiveTab] = useState("data");

  function handleRefresh() {
    refreshSchemaTree(path.connectionId, true).catch(() => undefined);
  }

  return (
    <ViewerShell
      breadcrumb={[
        {
          label: path.connectionLabel,
          view: {
            type: "schema-list",
            path: {
              connectionId: path.connectionId,
              connectionLabel: path.connectionLabel,
            },
          },
        },
        {
          label: path.schemaName,
          view: {
            type: "schema",
            path: {
              connectionId: path.connectionId,
              connectionLabel: path.connectionLabel,
              schemaName: path.schemaName,
            },
          },
        },
        {
          label: path.tableName,
          view: {
            type: "table-details",
            path,
          },
        },
      ]}
      onNavigateToView={(view) => {
        navigateToView(view).catch(() => undefined);
      }}
      onRefresh={handleRefresh}
    >
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex h-full min-h-0 flex-col"
      >
        <TabsList variant="line" className="h-8 shrink-0">
          <TabsTrigger value="data" className="h-7 px-3 text-xs">
            Data
          </TabsTrigger>
          <TabsTrigger value="structure" className="h-7 px-3 text-xs">
            Structure
          </TabsTrigger>
          <TabsTrigger value="indexes" className="h-7 px-3 text-xs">
            Indexes
          </TabsTrigger>
          <TabsTrigger value="constraints" className="h-7 px-3 text-xs">
            Constraints
          </TabsTrigger>
          <TabsTrigger value="triggers" className="h-7 px-3 text-xs">
            Triggers
          </TabsTrigger>
          <TabsTrigger value="types" className="h-7 px-3 text-xs">
            Types
          </TabsTrigger>
          <TabsTrigger value="query" className="h-7 px-3 text-xs">
            Query
          </TabsTrigger>
        </TabsList>

        <TabsContent value="data" className="min-h-0 flex-1">
          <DataTab
            connectionId={path.connectionId}
            schema={path.schemaName}
            table={path.tableName}
            relationType="table"
          />
        </TabsContent>

        <TabsContent value="structure" className="min-h-0 flex-1">
          <StructureTab
            connectionId={path.connectionId}
            schema={path.schemaName}
            table={path.tableName}
          />
        </TabsContent>

        <TabsContent value="indexes" className="min-h-0 flex-1">
          <IndexesTab
            connectionId={path.connectionId}
            schema={path.schemaName}
            table={path.tableName}
          />
        </TabsContent>

        <TabsContent value="constraints" className="min-h-0 flex-1">
          <ConstraintsTab
            connectionId={path.connectionId}
            schema={path.schemaName}
            table={path.tableName}
          />
        </TabsContent>

        <TabsContent value="triggers" className="min-h-0 flex-1">
          <TriggersTab
            connectionId={path.connectionId}
            schema={path.schemaName}
            table={path.tableName}
          />
        </TabsContent>

        <TabsContent value="types" className="min-h-0 flex-1">
          <TypesTab
            connectionId={path.connectionId}
            schema={path.schemaName}
            table={path.tableName}
          />
        </TabsContent>

        <TabsContent value="query" className="min-h-0 flex-1">
          <QueryTab
            connectionId={path.connectionId}
            schema={path.schemaName}
            table={path.tableName}
          />
        </TabsContent>
      </Tabs>
    </ViewerShell>
  );
}
