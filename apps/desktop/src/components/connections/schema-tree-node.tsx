import { ChevronRight, Eye, Folder, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DatabaseSchema } from "@/shared/types/connection";

interface SchemaTreeNodeProps {
  schema: DatabaseSchema;
  schemaExpanded: boolean;
  onToggleSchema: (schemaName: string) => void;
  onOpenSchema: (schemaName: string) => void;
  onOpenTable: (schemaName: string, tableName: string) => void;
  onOpenView: (schemaName: string, viewName: string) => void;
}

export function SchemaTreeNode({
  schema,
  schemaExpanded,
  onToggleSchema,
  onOpenSchema,
  onOpenTable,
  onOpenView,
}: Readonly<SchemaTreeNodeProps>) {
  const schemaCountText = String(schema.tables.length + schema.views.length);

  return (
    <div className="min-w-0 flex flex-col gap-0.5">
      <button
        type="button"
        className="grid min-h-8 w-full min-w-0 grid-cols-[auto_auto_minmax(0,1fr)_minmax(4ch,auto)] items-center gap-1 rounded-sm px-1 text-left text-xs hover:bg-sidebar-accent"
        onClick={() => {
          onOpenSchema(schema.name);
          onToggleSchema(schema.name);
        }}
        aria-label={
          schemaExpanded
            ? `Collapse schema ${schema.name}`
            : `Expand schema ${schema.name}`
        }
      >
        <ChevronRight
          className={cn(
            "size-3 text-muted-foreground transition-transform duration-200",
            schemaExpanded && "rotate-90",
          )}
        />
        <Folder className="size-3 shrink-0 text-muted-foreground" />
        <span className="min-w-0 truncate" title={schema.name}>
          {schema.name}
        </span>
        <span
          className="min-w-[4ch] shrink-0 pl-1 pr-1.5 text-right text-[10px] tabular-nums text-muted-foreground"
          title={`${schemaCountText} relations`}
        >
          {schemaCountText}
        </span>
      </button>

      {schemaExpanded ? (
        <div className="ml-3 flex flex-col gap-0.5 border-l border-sidebar-border pl-2">
          {schema.tables.map((tableName) => (
            <button
              key={`${schema.name}.${tableName}`}
              type="button"
              className="flex min-h-8 min-w-0 items-center gap-1 rounded-sm px-1 text-left text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              onClick={() => onOpenTable(schema.name, tableName)}
              aria-label={`Table ${tableName}`}
            >
              <Table2 className="size-3 shrink-0" />
              <span className="min-w-0 flex-1 truncate" title={tableName}>
                {tableName}
              </span>
            </button>
          ))}
          {schema.views.map((view) => (
            <button
              key={`${schema.name}.${view.name}`}
              type="button"
              className="flex min-h-8 min-w-0 items-center gap-1 rounded-sm px-1 text-left text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              onClick={() => onOpenView(schema.name, view.name)}
              aria-label={`View ${view.name}`}
            >
              <Eye className="size-3 shrink-0" />
              <span className="min-w-0 flex-1 truncate" title={view.name}>
                {view.name}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
