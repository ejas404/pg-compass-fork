import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EditableCell } from '@/components/workspace/table-viewer/editable-cell';
import type { ColumnInfo } from '@/shared/types/table-data';
import type { EditContext } from '@/components/workspace/table-viewer/data-tab';

interface TableDataViewProps {
  columns: ColumnInfo[];
  rows: Record<string, unknown>[];
  editContext: EditContext;
}

function pkValuesFor(row: Record<string, unknown>, primaryKey: string[] | null): unknown[] {
  if (!primaryKey) return [];
  return primaryKey.map((col) => row[col]);
}

export function TableDataView({
  columns,
  rows,
  editContext,
}: Readonly<TableDataViewProps>) {
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
            const pkValues = pkValuesFor(row, editContext.primaryKey);
            return (
              <TableRow key={rowKey} className="hover:bg-muted/50">
                {columns.map((col) => (
                  <TableCell
                    key={col.name}
                    className="max-w-75 truncate font-mono text-xs"
                  >
                    <EditableCell
                      col={col}
                      value={row[col.name]}
                      readOnly={editContext.readOnly}
                      primaryKey={editContext.primaryKey}
                      pkValues={pkValues}
                      schema={editContext.schema}
                      table={editContext.table}
                      connectionId={editContext.connectionId}
                      variant="cell"
                      onRowUpdated={(updated) => editContext.onRowUpdated(rowIndex, updated)}
                    />
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
