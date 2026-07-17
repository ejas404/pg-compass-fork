import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EditableCell } from "@/components/workspace/table-viewer/editable-cell";
import { RowEditButton } from "@/components/workspace/table-viewer/row-edit-button";
import type { ColumnInfo } from "@/shared/types/table-data";
import type { EditContext } from "@/components/workspace/table-viewer/data-tab";
import {
  DataCopyButton,
  serializeCellValue,
  serializeRow,
} from "@/components/workspace/table-viewer/data-copy";

interface TableDataViewProps {
  columns: ColumnInfo[];
  rows: Record<string, unknown>[];
  editContext: EditContext;
}

function pkValuesFor(
  row: Record<string, unknown>,
  primaryKey: string[] | null,
): unknown[] {
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
            <TableHead className="w-8 sticky left-0 z-20 bg-card" />
            {columns.map((col) => (
              <TableHead key={col.name} className="whitespace-nowrap">
                <div className="group/header flex items-center gap-1">
                  <div className="flex flex-col gap-0.5">
                    <span>{col.name}</span>
                    <span className="text-[11px] font-normal text-muted-foreground/70">
                      {col.dataType}
                    </span>
                  </div>
                  <DataCopyButton
                    label={`Copy column name ${col.name}`}
                    text={col.name}
                    successMessage="Column name copied"
                    className="size-8 opacity-0 group-hover/header:opacity-100 focus-visible:opacity-100"
                  />
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
                <TableCell className="w-8 p-0 align-middle">
                  <div className="flex h-full items-center justify-center gap-0.5 px-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    <DataCopyButton
                      label={`Copy row ${String(rowIndex + 1)}`}
                      text={serializeRow(columns, row)}
                      successMessage="Row copied as JSON"
                    />
                    {showRowEdit ? (
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
                    ) : null}
                  </div>
                </TableCell>
                {columns.map((col) => (
                  <TableCell
                    key={col.name}
                    className="max-w-75 truncate font-mono text-xs"
                  >
                    <div className="group/cell flex min-w-0 items-center gap-1">
                      <div className="min-w-0 flex-1 truncate">
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
                          onRowUpdated={(updated) =>
                            editContext.onRowUpdated(rowIndex, updated)
                          }
                        />
                      </div>
                      <DataCopyButton
                        label={`Copy ${col.name} value`}
                        text={serializeCellValue(row[col.name])}
                        successMessage="Cell value copied"
                        className="size-8 shrink-0 opacity-0 group-hover/cell:opacity-100 focus-visible:opacity-100"
                      />
                    </div>
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
