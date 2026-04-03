import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { IndexInfo } from '@/shared/types/table-data';

interface IndexesTabProps {
  connectionId: string;
  schema: string;
  table: string;
}

export function IndexesTab({ connectionId, schema, table }: Readonly<IndexesTabProps>) {
  const [indexes, setIndexes] = useState<IndexInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const result = await globalThis.window.tableDataApi.getIndexes({
        connectionId,
        schema,
        table,
      });
      if (!result.success || !result.data) {
        toast.error('Failed to load indexes', { description: result.error });
        return;
      }
      setIndexes(result.data);
    } catch (err) {
      toast.error('Failed to load indexes', { description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }, [connectionId, schema, table]);

  useEffect(function loadIndexes() {
    fetch();
  }, [fetch]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (indexes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No indexes found on this table.
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-card">
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Properties</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Scans</TableHead>
            <TableHead>Tuples Read</TableHead>
            <TableHead>Tuples Fetched</TableHead>
            <TableHead>Definition</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {indexes.map((idx) => (
            <TableRow key={idx.name} className="hover:bg-muted/50">
              <TableCell className="font-medium">{idx.name}</TableCell>
              <TableCell>
                <Badge variant="secondary" className="font-mono text-[10px]">
                  {idx.type}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {idx.isPrimary && (
                    <Badge variant="default" className="text-[10px] px-1.5 py-0">
                      PK
                    </Badge>
                  )}
                  {idx.isUnique && !idx.isPrimary && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      Unique
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-xs tabular-nums text-muted-foreground">
                {idx.size}
              </TableCell>
              <TableCell className="text-xs tabular-nums text-muted-foreground">
                {idx.scans.toLocaleString()}
              </TableCell>
              <TableCell className="text-xs tabular-nums text-muted-foreground">
                {idx.tuplesRead.toLocaleString()}
              </TableCell>
              <TableCell className="text-xs tabular-nums text-muted-foreground">
                {idx.tuplesFetched.toLocaleString()}
              </TableCell>
              <TableCell className="max-w-100 truncate font-mono text-[10px] text-muted-foreground">
                <span title={idx.definition}>{idx.definition}</span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
