import { useMemo } from 'react';
import { RelationListTable } from '@/components/workspace/relation-list-table';
import { ViewerShell } from '@/components/workspace/viewer-shell';
import { useWorkspace } from '@/hooks/use-workspace';
import type { TableListViewerPath } from '@/shared/types/workspace';

interface TableListViewerProps {
  path: TableListViewerPath;
}

function formatEstimatedRowCount(value: number | null | undefined): string {
  if (value == null) {
    return 'Unknown';
  }

  return new Intl.NumberFormat().format(value);
}

export function TableListViewer({ path }: Readonly<TableListViewerProps>) {
  const { schemaCache, refreshSchemaTree, navigateToView } = useWorkspace();

  const rows = useMemo(() => {
    const schema = schemaCache[path.connectionId]?.find(
      (item) => item.name === path.schemaName,
    );

    return (
      schema?.tables.map((tableName) => {
        const stats = schema.tableStats?.[tableName];

        return {
          name: tableName,
          rowCount: formatEstimatedRowCount(stats?.estimatedRowCount),
          sizeOnDisk: stats?.sizeOnDisk ?? 'Unknown',
        };
      }) ?? []
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
          label: path.tableName,
          view: {
            type: 'table-list',
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
        selectedName={path.tableName}
        emptyMessage="No tables found in this schema."
      />
    </ViewerShell>
  );
}
