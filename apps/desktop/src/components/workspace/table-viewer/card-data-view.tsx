import { ScrollArea } from '@/components/ui/scroll-area';
import { typeRegistry } from '@/components/workspace/renderers/type-registry';
import { JsonTree } from '@/components/workspace/table-viewer/json-tree';
import { EditableCell } from '@/components/workspace/table-viewer/editable-cell';
import type { ColumnInfo } from '@/shared/types/table-data';
import type { EditContext } from '@/components/workspace/table-viewer/data-tab';

interface CardDataViewProps {
  columns: ColumnInfo[];
  rows: Record<string, unknown>[];
  editContext: EditContext;
}

function isStructuredValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  return typeof value === 'object';
}

function renderCardDisplay(col: ColumnInfo, value: unknown) {
  const isNull = value === null || value === undefined;
  if (isNull) {
    return typeRegistry.get('__null__').renderCard(value);
  }
  const isJson = col.dataType === 'json' || col.dataType === 'jsonb';
  const isStructured = isJson || isStructuredValue(value);
  if (isStructured) {
    return <JsonTree value={value} />;
  }
  return typeRegistry.get(col.dataType).renderCard(value);
}

function pkValuesFor(row: Record<string, unknown>, primaryKey: string[] | null): unknown[] {
  if (!primaryKey) return [];
  return primaryKey.map((col) => row[col]);
}

export function CardDataView({
  columns,
  rows,
  editContext,
}: Readonly<CardDataViewProps>) {
  if (rows.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No rows to display.
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-3 p-1">
        {rows.map((row, rowIndex) => {
          const rowKey = `card-${String(rowIndex)}`;
          const pkValues = pkValuesFor(row, editContext.primaryKey);
          return (
            <div
              key={rowKey}
              className="rounded-lg border border-border bg-card"
            >
              <div className="border-b border-border px-3 py-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Document {rowIndex + 1}
                </span>
              </div>
              <div className="px-3 py-2">
                {columns.map((col) => (
                  <div key={col.name} className="flex gap-2 border-b border-border/30 py-1.5 last:border-b-0">
                    <div className="flex flex-col w-36 shrink-0 items-start gap-1.5">
                      <span className="text-xs font-medium text-foreground/80">{col.name}</span>
                      <span className="text-[10px] text-muted-foreground/50">{col.dataType}</span>
                    </div>
                    <div className="min-w-0 flex-1 font-mono text-xs">
                      <EditableCell
                        col={col}
                        value={row[col.name]}
                        readOnly={editContext.readOnly}
                        primaryKey={editContext.primaryKey}
                        pkValues={pkValues}
                        schema={editContext.schema}
                        table={editContext.table}
                        connectionId={editContext.connectionId}
                        variant="card"
                        displayOverride={renderCardDisplay(col, row[col.name])}
                        onRowUpdated={(updated) =>
                          editContext.onRowUpdated(rowIndex, updated)
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
