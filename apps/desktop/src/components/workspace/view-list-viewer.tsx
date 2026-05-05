import { useMemo } from 'react';
import { RelationListTable } from '@/components/workspace/relation-list-table';
import { ViewerShell } from '@/components/workspace/viewer-shell';
import { useWorkspace } from '@/hooks/use-workspace';
import type { ViewListViewerPath } from '@/shared/types/workspace';

interface ViewListViewerProps {
  path: ViewListViewerPath;
}

export function ViewListViewer({ path }: Readonly<ViewListViewerProps>) {
  const { schemaCache, refreshSchemaTree, navigateToView } = useWorkspace();

  const rows = useMemo(() => {
    const schema = schemaCache[path.connectionId]?.find(
      (item) => item.name === path.schemaName,
    );

    return (
      schema?.views.map((view) => ({
        name: view.name,
        rowCount: 'Unknown',
        sizeOnDisk: 'Unknown',
        definition: view.definition ?? undefined,
      })) ?? []
    );
  }, [schemaCache, path.connectionId, path.schemaName]);

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
        onOpenRow={(row) => {
          navigateToView({
            type: 'view-details',
            path: { ...path, viewName: row.name },
          }).catch(() => undefined);
        }}
        includeDefinition
        emptyMessage="No views found in this schema."
      />
    </ViewerShell>
  );
}
