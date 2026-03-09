import { useMemo } from 'react';
import { RelationListTable } from '@/components/workspace/relation-list-table';
import { ViewerShell } from '@/components/workspace/viewer-shell';
import { useWorkspace } from '@/hooks/use-workspace';
import type { ViewListViewerPath } from '@/shared/types/workspace';

interface ViewListViewerProps {
  path: ViewListViewerPath;
}

export function ViewListViewer({ path }: Readonly<ViewListViewerProps>) {
  const { refreshSchemaTree, navigateToView } = useWorkspace();

  const rows = useMemo(
    () => [
      {
        name: path.viewName,
        rowCount: 'Unknown',
        sizeOnDisk: 'Unknown',
        definition: `SELECT * FROM ${path.schemaName}.${path.viewName};`,
      },
    ],
    [path.schemaName, path.viewName],
  );

  function handleRefresh() {
    refreshSchemaTree(path.connectionId, true).catch(() => undefined);
  }

  return (
    <ViewerShell
      breadcrumb={[
        {
          label: path.connectionLabel,
          view: {
            type: 'schema-list',
            path: {
              connectionId: path.connectionId,
              connectionLabel: path.connectionLabel,
            },
          },
        },
        {
          label: path.schemaName,
          view: {
            type: 'schema',
            path: {
              connectionId: path.connectionId,
              connectionLabel: path.connectionLabel,
              schemaName: path.schemaName,
            },
          },
        },
        {
          label: path.viewName,
          view: {
            type: 'view-list',
            path,
          },
        },
      ]}
      onNavigateToView={(view) => {
        navigateToView(view).catch(() => undefined);
      }}
      onRefresh={handleRefresh}
    >
      <RelationListTable
        rows={rows}
        selectedName={path.viewName}
        includeDefinition
        emptyMessage="No views found in this schema."
      />
    </ViewerShell>
  );
}
