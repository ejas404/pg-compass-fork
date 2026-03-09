import { Database } from 'lucide-react';
import { ViewerShell } from '@/components/workspace/viewer-shell';
import { useWorkspace } from '@/hooks/use-workspace';
import type { TableListViewerPath } from '@/shared/types/workspace';

interface TableDetailsViewerProps {
  path: TableListViewerPath;
}

export function TableDetailsViewer({ path }: Readonly<TableDetailsViewerProps>) {
  const { refreshSchemaTree, navigateToView } = useWorkspace();

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
            type: 'table-details',
            path,
          },
        },
      ]}
      onNavigateToView={(view) => {
        navigateToView(view).catch(() => undefined);
      }}
      onRefresh={handleRefresh}
    >
      <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border p-6">
        <div className="flex max-w-md flex-col items-center gap-3 text-center">
          <div className="rounded-lg bg-muted p-3">
            <Database className="size-5 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-semibold">Table details viewer placeholder</h3>
          <p className="text-sm text-muted-foreground">
            Data, structure, indexes, constraints, and query tabs for
            {' '}
            <span className="font-medium text-foreground">
              {path.schemaName}.{path.tableName}
            </span>{' '}
            will be implemented in the upcoming task.
          </p>
        </div>
      </div>
    </ViewerShell>
  );
}
