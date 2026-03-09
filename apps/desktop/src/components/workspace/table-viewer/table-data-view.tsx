import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { typeRegistry } from '@/components/workspace/renderers/type-registry';
import type { ColumnInfo } from '@/shared/types/table-data';

interface TableDataViewProps {
  columns: ColumnInfo[];
  rows: Record<string, unknown>[];
}

export function TableDataView({ columns, rows }: Readonly<TableDataViewProps>) {
  if (rows.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No rows to display.
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-card">
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.name} className="whitespace-nowrap">
                <div className="flex flex-col gap-0.5">
                  <span>{col.name}</span>
                  <span className="text-[10px] font-normal text-muted-foreground/60">
                    {col.dataType}
                  </span>
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, rowIndex) => {
            const rowKey = `row-${String(rowIndex)}`;
            return (
              <TableRow key={rowKey} className="hover:bg-muted/50">
                {columns.map((col) => {
                  const value = row[col.name];
                  const isNull = value === null || value === undefined;
                  const renderer = isNull
                    ? typeRegistry.get('__null__')
                    : typeRegistry.get(col.dataType);

                  return (
                    <TableCell
                      key={col.name}
                      className="max-w-75 truncate font-mono text-xs"
                    >
                      {renderer.renderCell(value)}
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
