import { Fragment, useCallback, useEffect, useState } from "react";
import { ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TableTypeInfo } from "@/shared/types/table-data";
import { cn } from "@/lib/utils";

interface TypesTabProps {
  connectionId: string;
  schema: string;
  table: string;
}

function typeKey(type: TableTypeInfo): string {
  return `${type.schema}.${type.name}`;
}

function usedByLabel(type: TableTypeInfo): string {
  return type.usedByColumns
    .map((column) => `${column.name}${column.isArray ? "[]" : ""}`)
    .join(", ");
}

function summary(type: TableTypeInfo): string {
  switch (type.kind) {
    case "ENUM": {
      const preview = type.enumLabels.slice(0, 3).join(", ");
      const suffix = type.enumLabels.length > 3 ? ", ..." : "";
      return `${type.enumLabels.length.toLocaleString()} values${preview ? `: ${preview}${suffix}` : ""}`;
    }
    case "DOMAIN": {
      const details = [
        type.domainBaseType ?? "unknown base",
        type.domainDefault ? "default" : null,
        type.domainConstraints.length > 0 ? "check" : null,
      ].filter(Boolean);
      return details.join(", ");
    }
    case "COMPOSITE":
      return `${type.compositeAttributes.length.toLocaleString()} attributes`;
  }
}

function kindVariant(
  kind: TableTypeInfo["kind"],
): "default" | "secondary" | "outline" {
  if (kind === "ENUM") return "secondary";
  if (kind === "DOMAIN") return "outline";
  return "default";
}

function TypeDetails({ type }: Readonly<{ type: TableTypeInfo }>) {
  if (type.kind === "ENUM") {
    return (
      <div className="flex flex-wrap gap-1">
        {type.enumLabels.map((label) => (
          <Badge
            key={label}
            variant="outline"
            className="font-mono text-[10px]"
          >
            {label}
          </Badge>
        ))}
      </div>
    );
  }

  if (type.kind === "DOMAIN") {
    return (
      <dl className="grid gap-2 text-xs sm:grid-cols-[8rem_1fr]">
        <dt className="text-muted-foreground">Base type</dt>
        <dd className="font-mono">{type.domainBaseType ?? "unknown"}</dd>
        {type.domainDefault && (
          <>
            <dt className="text-muted-foreground">Default</dt>
            <dd className="font-mono">{type.domainDefault}</dd>
          </>
        )}
        {type.domainConstraints.length > 0 && (
          <>
            <dt className="text-muted-foreground">Constraints</dt>
            <dd className="space-y-1">
              {type.domainConstraints.map((constraint) => (
                <div
                  key={constraint}
                  className="font-mono text-muted-foreground"
                >
                  {constraint}
                </div>
              ))}
            </dd>
          </>
        )}
      </dl>
    );
  }

  return (
    <div className="overflow-auto rounded-md border border-border">
      <Table>
        <TableHeader className="bg-card">
          <TableRow>
            <TableHead>Attribute</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Nullable</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {type.compositeAttributes.map((attribute) => (
            <TableRow key={attribute.name}>
              <TableCell className="font-medium">{attribute.name}</TableCell>
              <TableCell>
                <Badge variant="secondary" className="font-mono text-[10px]">
                  {attribute.dataType}
                </Badge>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {attribute.isNullable ? "YES" : "NOT NULL"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function TypesTab({
  connectionId,
  schema,
  table,
}: Readonly<TypesTabProps>) {
  const [types, setTypes] = useState<TableTypeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedType, setExpandedType] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const result = await globalThis.window.tableDataApi.getTypes({
        connectionId,
        schema,
        table,
      });
      if (!result.success || !result.data) {
        toast.error("Failed to load types", { description: result.error });
        return;
      }
      setTypes(result.data);
    } catch (err) {
      toast.error("Failed to load types", {
        description: (err as Error).message,
      });
    } finally {
      setLoading(false);
    }
  }, [connectionId, schema, table]);

  useEffect(
    function loadTypes() {
      fetch();
    },
    [fetch],
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (types.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No user-defined types found on this table.
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-card">
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Schema</TableHead>
            <TableHead>Kind</TableHead>
            <TableHead>Used By</TableHead>
            <TableHead>Summary</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {types.map((type) => {
            const key = typeKey(type);
            const expanded = expandedType === key;

            return (
              <Fragment key={key}>
                <TableRow key={key} className="hover:bg-muted/50">
                  <TableCell className="font-medium">
                    <button
                      type="button"
                      className="flex items-center gap-2 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-expanded={expanded}
                      onClick={() => {
                        setExpandedType(expanded ? null : key);
                      }}
                    >
                      <ChevronRight
                        className={cn(
                          "size-3.5 shrink-0 text-muted-foreground transition-transform",
                          expanded && "rotate-90",
                        )}
                      />
                      <span>{type.name}</span>
                    </button>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {type.schema}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={kindVariant(type.kind)}
                      className="font-mono text-[10px]"
                    >
                      {type.kind}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {type.usedByColumns.map((column) => (
                        <Badge
                          key={`${column.name}-${String(column.isArray)}`}
                          variant="outline"
                          className="font-mono text-[10px]"
                        >
                          {column.name}
                          {column.isArray ? "[]" : ""}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-100 truncate text-xs text-muted-foreground">
                    <span title={summary(type)}>{summary(type)}</span>
                  </TableCell>
                </TableRow>
                {expanded && (
                  <TableRow key={`${key}-details`}>
                    <TableCell colSpan={5} className="bg-muted/20 p-3">
                      <div className="mb-2 text-xs text-muted-foreground">
                        Used by {usedByLabel(type)}
                      </div>
                      <TypeDetails type={type} />
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
