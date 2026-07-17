import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Play, Table2, LayoutList, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  SqlEditor,
  type CompletionSchema,
} from "@/components/sql-editor/sql-editor";
import { DataPagination } from "@/components/workspace/table-viewer/data-pagination";
import { TableDataView } from "@/components/workspace/table-viewer/table-data-view";
import { CardDataView } from "@/components/workspace/table-viewer/card-data-view";
import type { EditContext } from "@/components/workspace/table-viewer/data-tab";
import { ExportDropdown } from "@/components/workspace/export-dropdown";
import { useWorkspace } from "@/hooks/use-workspace";
import { useLatestRequest } from "@/hooks/use-latest-request";
import type { ColumnInfo } from "@/shared/types/table-data";

type ViewMode = "table" | "card";

// Ad-hoc queries cannot be tied back to a single source relation, so cells
// in the query tab are never editable. Phase 2 may lift this for simple
// single-table selects.
const NON_EDITABLE_CONTEXT: EditContext = {
  connectionId: "",
  schema: "",
  table: "",
  readOnly: true,
  primaryKey: null,
  onRowUpdated: () => undefined,
};

function QueryResultView({
  viewMode,
  columns,
  rows,
}: Readonly<{
  viewMode: ViewMode;
  columns: ColumnInfo[];
  rows: Record<string, unknown>[];
}>) {
  if (viewMode === "table") {
    return (
      <TableDataView
        columns={columns}
        rows={rows}
        editContext={NON_EDITABLE_CONTEXT}
      />
    );
  }
  return (
    <CardDataView
      columns={columns}
      rows={rows}
      editContext={NON_EDITABLE_CONTEXT}
    />
  );
}

interface QueryTabProps {
  connectionId: string;
  schema: string;
  table: string;
  refreshSignal?: number;
  onRefreshComplete?: (success: boolean) => void;
}

export function QueryTab({
  connectionId,
  schema,
  table,
  refreshSignal = 0,
  onRefreshComplete,
}: Readonly<QueryTabProps>) {
  const { schemaCache } = useWorkspace();
  const runLatestRequest = useLatestRequest();
  const [sql, setSql] = useState(
    `SELECT * FROM "${schema}"."${table}" LIMIT 100;`,
  );
  const [columns, setColumns] = useState<ColumnInfo[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [error, setError] = useState<string | null>(null);
  const [lastSuccessfulSql, setLastSuccessfulSql] = useState<string | null>(
    null,
  );
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const activeQueryIdRef = useRef<string | null>(null);
  const seenRefreshSignal = useRef(refreshSignal);

  const completionSchema = useMemo<CompletionSchema>(() => {
    const schemas: string[] = [];
    const tables: Record<string, string[]> = {};
    const cols: Record<string, { name: string; type?: string }[]> = {};

    for (const [connId, dbSchemas] of Object.entries(schemaCache)) {
      if (connId !== connectionId) continue;
      for (const s of dbSchemas) {
        schemas.push(s.name);
        tables[s.name] = [...s.tables, ...s.views.map((view) => view.name)];
      }
    }

    // Add columns from query results if available
    if (columns.length > 0) {
      const key = `${schema}.${table}`;
      cols[key] = columns.map((c) => ({ name: c.name, type: c.dataType }));
    }

    return {
      schemas,
      tables,
      columns: cols,
      defaultSchema: schema,
    };
  }, [schemaCache, connectionId, schema, table, columns]);

  const executeQuery = useCallback(
    async (p: number, ps: number, submittedSql = sql) => {
      const queryId = globalThis.crypto.randomUUID();
      activeQueryIdRef.current = queryId;
      setLoading(true);
      setError(null);
      const request = await runLatestRequest(() =>
        globalThis.window.tableDataApi.executeQuery({
          connectionId,
          queryId,
          sql: submittedSql,
          page: p,
          pageSize: ps,
        }),
      );
      if (request.status === "stale") return false;
      if (request.status === "error") {
        const msg = (request.error as Error).message;
        setError(msg);
        toast.error("Query failed", { description: msg });
        if (activeQueryIdRef.current === queryId) {
          activeQueryIdRef.current = null;
          setLoading(false);
        }
        return false;
      }
      const result = request.value;
      if (!result.success || !result.data) {
        const message = result.error ?? "Unknown error";
        setError(message);
        if (message === "Query cancelled.") {
          toast.info("Query cancelled", {
            description: "The last successful result is still available.",
          });
        } else {
          toast.error("Query failed", { description: message });
        }
        if (activeQueryIdRef.current === queryId) {
          activeQueryIdRef.current = null;
          setLoading(false);
        }
        return false;
      }
      setColumns(result.data.columns);
      setRows(result.data.rows);
      setTotalCount(result.data.totalCount);
      setHasRun(true);
      setLastSuccessfulSql(submittedSql);
      setLastRefreshedAt(new Date());
      if (activeQueryIdRef.current === queryId) {
        activeQueryIdRef.current = null;
        setLoading(false);
      }
      return true;
    },
    [connectionId, runLatestRequest, sql],
  );

  useEffect(() => {
    if (seenRefreshSignal.current === refreshSignal) return;
    seenRefreshSignal.current = refreshSignal;
    if (loading) {
      toast.info("A query is already running", {
        description: "Cancel it before refreshing the last result.",
      });
      onRefreshComplete?.(false);
      return;
    }
    if (!lastSuccessfulSql) {
      onRefreshComplete?.(true);
      return;
    }
    void executeQuery(page, pageSize, lastSuccessfulSql).then((success) =>
      onRefreshComplete?.(success),
    );
  }, [
    executeQuery,
    lastSuccessfulSql,
    loading,
    onRefreshComplete,
    page,
    pageSize,
    refreshSignal,
  ]);

  function handleRun() {
    if (loading) return;
    setPage(1);
    executeQuery(1, pageSize);
  }

  function handlePageChange(p: number) {
    if (loading) return;
    setPage(p);
    executeQuery(p, pageSize);
  }

  function handlePageSizeChange(ps: number) {
    if (loading) return;
    setPageSize(ps);
    setPage(1);
    executeQuery(1, ps);
  }

  async function handleCancel() {
    const queryId = activeQueryIdRef.current;
    if (!queryId) return;
    const result = await globalThis.window.tableDataApi.cancelQuery({
      connectionId,
      queryId,
    });
    if (!result.success || !result.data) {
      toast.error("Failed to cancel query", { description: result.error });
      return;
    }
    if (result.data.status === "already-finished") {
      toast.info("Query already finished");
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Editor area */}
      <div
        className="flex flex-col gap-2 border-b border-border p-3"
        data-query-editor
      >
        <SqlEditor
          value={sql}
          onChange={setSql}
          onSubmit={handleRun}
          placeholder="Write a SELECT query…"
          schema={completionSchema}
          minHeight="96px"
        />
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            Only SELECT statements are allowed. Press Ctrl+Enter to run.
          </span>
          {loading ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="gap-1.5"
              onClick={() => void handleCancel()}
            >
              <Square className="size-3.5" />
              Cancel
            </Button>
          ) : (
            <Button
              type="button"
              variant="default"
              size="sm"
              className="gap-1.5"
              onClick={handleRun}
              disabled={!sql.trim()}
            >
              <Play className="size-3.5" />
              Run Query
            </Button>
          )}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="border-b border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* Results */}
      {hasRun && (
        <>
          <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
            <span className="text-xs text-muted-foreground">
              {totalCount.toLocaleString()} row{totalCount === 1 ? "" : "s"}{" "}
              returned
              {lastRefreshedAt
                ? ` · updated ${lastRefreshedAt.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : ""}
            </span>
            <div className="flex items-center gap-2">
              <ExportDropdown
                connectionId={connectionId}
                schema={schema}
                table={table}
                sql={lastSuccessfulSql ?? sql}
                hasQueryResults={hasRun && rows.length > 0}
              />
              <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
                <Button
                  type="button"
                  variant={viewMode === "table" ? "secondary" : "ghost"}
                  size="icon-sm"
                  className="size-8"
                  onClick={() => setViewMode("table")}
                  aria-label="Table view"
                >
                  <Table2 className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant={viewMode === "card" ? "secondary" : "ghost"}
                  size="icon-sm"
                  className="size-8"
                  onClick={() => setViewMode("card")}
                  aria-label="Card view"
                >
                  <LayoutList className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1">
            <QueryResultView
              viewMode={viewMode}
              columns={columns}
              rows={rows}
            />
          </div>

          <DataPagination
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            disabled={loading}
          />
        </>
      )}

      {/* Initial state before running */}
      {!hasRun && !error && (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          {loading
            ? "Running query…"
            : "Write a query and press Run to see results."}
        </div>
      )}
    </div>
  );
}
