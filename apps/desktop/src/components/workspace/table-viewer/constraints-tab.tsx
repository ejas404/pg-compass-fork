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
import type { ConstraintInfo } from '@/shared/types/table-data';

interface ConstraintsTabProps {
  connectionId: string;
  schema: string;
  table: string;
}

const CONSTRAINT_TYPE_ORDER: ConstraintInfo['type'][] = [
  'PRIMARY KEY',
  'FOREIGN KEY',
  'UNIQUE',
  'CHECK',
  'EXCLUDE',
];

const CONSTRAINT_BADGE_VARIANT: Record<ConstraintInfo['type'], 'default' | 'secondary' | 'outline'> = {
  'PRIMARY KEY': 'default',
  'FOREIGN KEY': 'secondary',
  'UNIQUE': 'secondary',
  'CHECK': 'outline',
  'EXCLUDE': 'outline',
};

function groupByType(constraints: ConstraintInfo[]): Map<ConstraintInfo['type'], ConstraintInfo[]> {
  const groups = new Map<ConstraintInfo['type'], ConstraintInfo[]>();

  for (const type of CONSTRAINT_TYPE_ORDER) {
    const items = constraints.filter((c) => c.type === type);
    if (items.length > 0) {
      groups.set(type, items);
    }
  }

  return groups;
}

export function ConstraintsTab({ connectionId, schema, table }: Readonly<ConstraintsTabProps>) {
  const [constraints, setConstraints] = useState<ConstraintInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const result = await globalThis.window.tableDataApi.getConstraints({
        connectionId,
        schema,
        table,
      });
      if (!result.success || !result.data) {
        toast.error('Failed to load constraints', { description: result.error });
        return;
      }
      setConstraints(result.data);
    } catch (err) {
      toast.error('Failed to load constraints', { description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }, [connectionId, schema, table]);

  useEffect(function loadConstraints() {
    fetch();
  }, [fetch]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (constraints.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No constraints found on this table.
      </div>
    );
  }

  const groups = groupByType(constraints);

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-1">
      {Array.from(groups.entries()).map(([type, items]) => (
        <section key={type}>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Badge variant={CONSTRAINT_BADGE_VARIANT[type]} className="text-[10px]">
              {type}
            </Badge>
            <span className="text-xs text-muted-foreground">({items.length})</span>
          </h3>
          <div className="overflow-auto rounded-lg border border-border">
            <Table>
              <TableHeader className="bg-card">
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Columns</TableHead>
                  {type === 'FOREIGN KEY' && <TableHead>References</TableHead>}
                  <TableHead>Definition</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((c) => (
                  <TableRow key={c.name} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {c.columns.map((col) => (
                          <Badge key={col} variant="outline" className="font-mono text-[10px]">
                            {col}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    {type === 'FOREIGN KEY' && (
                      <TableCell className="text-xs text-muted-foreground">
                        {c.foreignTable && (
                          <span className="font-mono">
                            {c.foreignTable}({c.foreignColumns.join(', ')})
                          </span>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="max-w-100 truncate font-mono text-[10px] text-muted-foreground">
                      <span title={c.definition ?? undefined}>{c.definition}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      ))}
    </div>
  );
}
