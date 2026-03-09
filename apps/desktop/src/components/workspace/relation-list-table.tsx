import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

export interface RelationListRow {
  name: string;
  rowCount: string;
  sizeOnDisk: string;
  definition?: string;
}

interface RelationListTableProps {
  rows: RelationListRow[];
  selectedName?: string;
  onOpenRow?: (row: RelationListRow) => void;
  includeDefinition?: boolean;
  emptyMessage: string;
}

export function RelationListTable({
  rows,
  selectedName,
  onOpenRow,
  includeDefinition,
  emptyMessage,
}: Readonly<RelationListTableProps>) {
  if (rows.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto rounded-lg border border-border">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-card">
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Rows</TableHead>
            <TableHead>Size on Disk</TableHead>
            {includeDefinition && <TableHead>Definition</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const isSelected = selectedName === row.name;
            const clickable = Boolean(onOpenRow);

            return (
              <TableRow
                key={row.name}
                data-state={isSelected ? 'selected' : undefined}
                className={cn(clickable && 'cursor-pointer')}
                onClick={onOpenRow ? () => onOpenRow(row) : undefined}
              >
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell className="text-muted-foreground">{row.rowCount}</TableCell>
                <TableCell className="text-muted-foreground">{row.sizeOnDisk}</TableCell>
                {includeDefinition && (
                  <TableCell className="max-w-[36ch] truncate font-mono text-xs text-muted-foreground">
                    {row.definition ?? 'N/A'}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
