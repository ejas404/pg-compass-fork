import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLatestRequest } from "@/hooks/use-latest-request";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { ColumnStructure } from "@/shared/types/table-data";

interface StructureTabProps {
  connectionId: string;
  schema: string;
  table: string;
  refreshSignal?: number;
  onRefreshComplete?: (success: boolean) => void;
}

function formatType(col: ColumnStructure): string {
  let base = col.dataType;
  if (col.characterMaxLength != null) {
    base += `(${String(col.characterMaxLength)})`;
    return base;
  }
  if (col.numericPrecision == null) {
    return base;
  }
  base +=
    col.numericScale == null
      ? `(${String(col.numericPrecision)})`
      : `(${String(col.numericPrecision)},${String(col.numericScale)})`;
  return base;
}

function renderSample(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value as string | number | boolean);
}

export function StructureTab({
  connectionId,
  schema,
  table,
  refreshSignal = 0,
  onRefreshComplete,
}: Readonly<StructureTabProps>) {
  const runLatestRequest = useLatestRequest();
  const [columns, setColumns] = useState<ColumnStructure[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const request = await runLatestRequest(() => globalThis.window.tableDataApi.getStructure({
        connectionId,
        schema,
        table,
    }));
    if (request.status === "stale") return false;
    if (request.status === "error") {
      toast.error("Failed to load structure", { description: (request.error as Error).message });
      setLoading(false);
      return false;
    }
    const result = request.value;
      if (!result.success || !result.data) {
        toast.error("Failed to load structure", { description: result.error });
        setLoading(false);
        return false;
      }
      setColumns(result.data);
      setLoading(false);
      return true;
  }, [connectionId, runLatestRequest, schema, table]);

  useEffect(
    function loadStructure() {
      void fetch().then((success) => {
        if (refreshSignal > 0) onRefreshComplete?.(success);
      });
    },
    [fetch, onRefreshComplete, refreshSignal],
  );

  if (loading && columns.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (columns.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No columns found.
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-card">
          <TableRow>
            <TableHead className="w-8">#</TableHead>
            <TableHead>Column</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Nullable</TableHead>
            <TableHead>Default</TableHead>
            <TableHead>Sample Values</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {columns.map((col) => (
            <TableRow key={col.name} className="hover:bg-muted/50">
              <TableCell className="text-xs tabular-nums text-muted-foreground">
                {col.ordinalPosition}
              </TableCell>
              <TableCell className="font-medium">{col.name}</TableCell>
              <TableCell>
                <Badge variant="secondary" className="font-mono text-[10px]">
                  {formatType(col)}
                </Badge>
              </TableCell>
              <TableCell>
                {col.isNullable ? (
                  <span className="text-xs text-muted-foreground">YES</span>
                ) : (
                  <span className="text-xs font-medium">NOT NULL</span>
                )}
              </TableCell>
              <TableCell className="max-w-50 truncate font-mono text-xs text-muted-foreground">
                {col.columnDefault ?? (
                  <span className="italic text-muted-foreground/50">none</span>
                )}
              </TableCell>
              <TableCell className="max-w-75">
                <div className="flex flex-wrap gap-1">
                  {col.sampleValues.length > 0 ? (
                    col.sampleValues.slice(0, 3).map((val, i) => {
                      const key = `sample-${col.name}-${String(i)}`;
                      return (
                        <span
                          key={key}
                          className="inline-block max-w-30 truncate rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]"
                          title={renderSample(val)}
                        >
                          {renderSample(val)}
                        </span>
                      );
                    })
                  ) : (
                    <span className="text-xs italic text-muted-foreground/50">
                      no data
                    </span>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
