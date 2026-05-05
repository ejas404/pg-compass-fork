import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EditableCell } from '@/components/workspace/table-viewer/editable-cell';
import { RowEditButton } from '@/components/workspace/table-viewer/row-edit-button';
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

  // Row-edit affordance gating: when off, the gutter column is not rendered
  // at all — no header, no per-row cell. This is the same DOM contract as
  // EditableCell's read-only gate.
  const showRowEdit =
    !editContext.readOnly &&
    editContext.primaryKey !== null &&
    editContext.primaryKey.length > 0;

  return (
    <div className="h-full overflow-auto">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-card">
          <TableRow>
            {showRowEdit ? (
              <TableHead className="w-8 sticky left-0 z-20 bg-card" />
            ) : null}
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
              <TableRow key={rowKey} className="group hover:bg-muted/50">
                {showRowEdit ? (
                  <TableCell className="w-8 p-0 align-middle">
                    <div className="flex h-full items-center justify-center px-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                      <RowEditButton
                        columns={columns}
                        row={row}
                        readOnly={editContext.readOnly}
                        primaryKey={editContext.primaryKey}
                        schema={editContext.schema}
                        table={editContext.table}
                        connectionId={editContext.connectionId}
                        onRowUpdated={(updated) =>
                          editContext.onRowUpdated(rowIndex, updated)
                        }
                      />
                    </div>
                  </TableCell>
                ) : null}
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
