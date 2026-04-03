import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, LayoutList, Table2, Search, CircleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { SqlEditor, type CompletionSchema } from '@/components/sql-editor/SqlEditor';
import { DataPagination } from '@/components/workspace/table-viewer/data-pagination';
import { TableDataView } from '@/components/workspace/table-viewer/table-data-view';
import { CardDataView } from '@/components/workspace/table-viewer/card-data-view';
import { ExportDropdown } from '@/components/workspace/export-dropdown';
import { useWorkspace } from '@/hooks/use-workspace';
import type { ColumnInfo } from '@/shared/types/table-data';

type ViewMode = 'table' | 'card';

function DataViewContent({
  viewMode,
  columns,
  rows,
}: Readonly<{ viewMode: ViewMode; columns: ColumnInfo[]; rows: Record<string, unknown>[] }>) {
  if (viewMode === 'table') {
    return <TableDataView columns={columns} rows={rows} />;
  }
  return <CardDataView columns={columns} rows={rows} />;
}

function DataContent({
  viewMode,
  columns,
  rows,
  error,
}: Readonly<{
  viewMode: ViewMode;
  columns: ColumnInfo[];
  rows: Record<string, unknown>[];
  error: string | null;
}>) {
  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
        <CircleAlert className="size-5 text-destructive" />
        <p className="text-sm text-muted-foreground">No rows to display.</p>
        <p className="max-w-lg text-xs text-destructive">{error}</p>
      </div>
    );
  }
  return <DataViewContent viewMode={viewMode} columns={columns} rows={rows} />;
}

interface DataTabProps {
  connectionId: string;
  schema: string;
  table: string;
}

export function DataTab({ connectionId, schema, table }: Readonly<DataTabProps>) {
  const { schemaCache } = useWorkspace();
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [whereClause, setWhereClause] = useState('');
  const [pendingWhere, setPendingWhere] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [error, setError] = useState<string | null>(null);

  const completionSchema = useMemo<CompletionSchema>(() => {
    const schemas: string[] = [];
    const tables: Record<string, string[]> = {};
    const cols: Record<string, { name: string; type?: string }[]> = {};

    for (const [connId, dbSchemas] of Object.entries(schemaCache)) {
      if (connId !== connectionId) continue;
      for (const s of dbSchemas) {
        schemas.push(s.name);
        tables[s.name] = s.tables;
      }
    }

    if (columns.length > 0) {
      const key = `${schema}.${table}`;
      cols[key] = columns.map((c) => ({ name: c.name, type: c.dataType }));
    }

    return {
      schemas,
      tables,
      columns: cols,
      defaultTable: table,
      defaultSchema: schema,
    };
  }, [schemaCache, connectionId, schema, table, columns]);

  const fetchRows = useCallback(
    async (p: number, ps: number, where: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await globalThis.window.tableDataApi.getRows({
          connectionId,
          schema,
          table,
          page: p,
          pageSize: ps,
          whereClause: where || undefined,
        });
        if (!result.success || !result.data) {
          const msg = result.error ?? 'Unknown error';
          setError(msg);
          setRows([]);
          setTotalCount(0);
          toast.error('Failed to load rows', { description: msg });
          return;
        }

        setColumns(result.data.columns);
        setRows(result.data.rows);
        setTotalCount(result.data.totalCount);
      } catch (err) {
        const msg = (err as Error).message;
        setError(msg);
        setRows([]);
        setTotalCount(0);
        toast.error('Failed to load rows', { description: msg });
      } finally {
        setLoading(false);
      }
    },
    [connectionId, schema, table],
  );

  useEffect(function fetchTableData() {
    fetchRows(page, pageSize, whereClause);
  }, [fetchRows, page, pageSize, whereClause]);

  function handleWhereSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setWhereClause(pendingWhere);
  }

  function handleClearFilter() {
    setPendingWhere('');
    setWhereClause('');
    setPage(1);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <form onSubmit={handleWhereSubmit} className="flex min-w-0 flex-1 items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
            <SqlEditor
              value={pendingWhere}
              onChange={setPendingWhere}
              onSubmit={() => {
                setPage(1);
                setWhereClause(pendingWhere);
              }}
              placeholder="WHERE clause — e.g. id > 10 AND status = 'active'"
              schema={completionSchema}
              singleLine
              minHeight="32px"
              className="h-8 pl-5"
            />
          </div>
          <Button type="submit" variant="outline" size="sm" className="h-8 text-xs">
            Filter
          </Button>
          {whereClause && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={handleClearFilter}
            >
              Clear
            </Button>
          )}
        </form>

        <ExportDropdown
          connectionId={connectionId}
          schema={schema}
          table={table}
          whereClause={whereClause || undefined}
        />

        <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
          <Button
            type="button"
            variant={viewMode === 'table' ? 'secondary' : 'ghost'}
            size="icon-sm"
            className="size-6"
            onClick={() => setViewMode('table')}
            aria-label="Table view"
          >
            <Table2 className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant={viewMode === 'card' ? 'secondary' : 'ghost'}
            size="icon-sm"
            className="size-6"
            onClick={() => setViewMode('card')}
            aria-label="Card view"
          >
            <LayoutList className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="min-h-0 flex-1">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <DataContent viewMode={viewMode} columns={columns} rows={rows} error={error} />
        )}
      </div>

      {/* Pagination */}
      <DataPagination
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
