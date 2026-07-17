import { useEffect, useMemo, useRef, useState } from "react";
import { Database, Loader2, SearchX } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useConnections } from "@/hooks/use-connections";
import { ConnectionItem } from "@/components/connections/ConnectionItem";
import type { ConnectionConfig } from "@/shared/types/connection";
import type { DatabaseSchema } from "@/shared/types/connection";
import { useWorkspace } from "@/hooks/use-workspace";

export function filterConnectionTree(
  connection: ConnectionConfig,
  schemas: DatabaseSchema[],
  rawSearch: string,
): { matches: boolean; schemas: DatabaseSchema[] } {
  const search = rawSearch.trim().toLowerCase();
  if (!search) return { matches: true, schemas };
  if (connection.label.toLowerCase().includes(search)) {
    return { matches: true, schemas };
  }

  const filteredSchemas = schemas.flatMap((schema) => {
    if (schema.name.toLowerCase().includes(search)) return [schema];
    const tables = schema.tables.filter((name) =>
      name.toLowerCase().includes(search),
    );
    const views = schema.views.filter((view) =>
      view.name.toLowerCase().includes(search),
    );
    if (tables.length === 0 && views.length === 0) return [];
    return [{ ...schema, tables, views }];
  });
  return { matches: filteredSchemas.length > 0, schemas: filteredSchemas };
}

export function SidebarContent({
  onEdit,
  search,
}: Readonly<{
  onEdit: (c: ConnectionConfig) => void;
  search: string;
}>) {
  const { connections, loading } = useConnections();
  const { schemaCache, refreshSchemaTreeWithStatus } = useWorkspace();
  const [connectedConnectionIds, setConnectedConnectionIds] = useState(
    () => new Set<string>(),
  );
  const searchLoadedConnections = useRef(new Set<string>());
  const searchPendingConnections = useRef(new Set<string>());
  const [searchLoadingCount, setSearchLoadingCount] = useState(0);
  const searchActive = search.trim().length > 0;
  const connectedConnections = useMemo(
    () =>
      connections.filter((connection) =>
        connectedConnectionIds.has(connection.id),
      ),
    [connectedConnectionIds, connections],
  );

  function setConnectionConnected(
    connectionId: string,
    connected: boolean,
  ): void {
    setConnectedConnectionIds((current) => {
      const next = new Set(current);
      if (connected) {
        next.add(connectionId);
      } else {
        next.delete(connectionId);
        searchLoadedConnections.current.delete(connectionId);
      }
      return next;
    });
  }

  useEffect(() => {
    if (!searchActive) return;
    for (const connection of connectedConnections) {
      if (searchLoadedConnections.current.has(connection.id)) continue;
      if (searchPendingConnections.current.has(connection.id)) continue;
      searchPendingConnections.current.add(connection.id);
      setSearchLoadingCount(searchPendingConnections.current.size);
      void refreshSchemaTreeWithStatus(connection.id).then((result) => {
        searchPendingConnections.current.delete(connection.id);
        if (result.ok) searchLoadedConnections.current.add(connection.id);
        setSearchLoadingCount(searchPendingConnections.current.size);
      });
    }
  }, [connectedConnections, refreshSchemaTreeWithStatus, searchActive]);

  const filteredConnections = useMemo(
    () =>
      connectedConnections.flatMap((connection) => {
        const filtered = filterConnectionTree(
          connection,
          schemaCache[connection.id] ?? [],
          search,
        );
        return filtered.matches
          ? [{ connection, schemas: filtered.schemas }]
          : [];
      }),
    [connectedConnections, schemaCache, search],
  );

  // Separate favourites from the rest
  const favourites = connections.filter((c) => c.favourite);
  const others = connections.filter((c) => !c.favourite);

  if (loading) {
    return (
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-2 px-3 py-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={`skeleton-${String(i)}`}
              className="flex items-center gap-2 px-2 py-1.5"
            >
              <div className="size-4 rounded bg-sidebar-accent" />
              <div className="h-3 flex-1 rounded bg-sidebar-accent" />
            </div>
          ))}
        </div>
      </ScrollArea>
    );
  }

  if (connections.length === 0) {
    return (
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
          <div className="rounded-lg bg-sidebar-accent p-3">
            <Database className="size-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No connections yet</p>
          <p className="text-xs text-muted-foreground/60">
            Add a PostgreSQL connection to start exploring your databases.
          </p>
        </div>
      </ScrollArea>
    );
  }

  if (searchActive && filteredConnections.length === 0) {
    if (searchLoadingCount > 0) {
      return (
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex items-center justify-center gap-2 px-4 py-8 text-xs text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Searching cached relation trees…
          </div>
        </ScrollArea>
      );
    }
    if (connectedConnections.length === 0) {
      return (
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
            <div className="rounded-lg bg-sidebar-accent p-3">
              <SearchX className="size-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              No connected instances
            </p>
            <p className="text-xs text-muted-foreground/60">
              Clear search, then connect to an instance to search its schemas
              and relations.
            </p>
          </div>
        </ScrollArea>
      );
    }
    return (
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
          <div className="rounded-lg bg-sidebar-accent p-3">
            <SearchX className="size-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No matching relations</p>
          <p className="text-xs text-muted-foreground/60">
            Try a connection, schema, table, or view name.
          </p>
        </div>
      </ScrollArea>
    );
  }

  if (searchActive) {
    return (
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-0.5 px-2 py-2">
          {filteredConnections.map(({ connection, schemas }) => (
            <ConnectionItem
              key={connection.id}
              connection={connection}
              onEdit={onEdit}
              connected
              onConnectedChange={(connected) =>
                setConnectionConnected(connection.id, connected)
              }
              searchSchemas={schemas}
              searchActive
            />
          ))}
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="flex flex-col gap-0.5 px-2 py-2">
        {favourites.length > 0 && (
          <>
            <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">
              Favourites
            </p>
            {favourites.map((c) => (
              <ConnectionItem
                key={c.id}
                connection={c}
                onEdit={onEdit}
                connected={connectedConnectionIds.has(c.id)}
                onConnectedChange={(connected) =>
                  setConnectionConnected(c.id, connected)
                }
              />
            ))}
            {others.length > 0 && (
              <Separator className="my-1.5 bg-sidebar-border" />
            )}
          </>
        )}
        {others.length > 0 && (
          <>
            {favourites.length > 0 && (
              <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">
                Connections
              </p>
            )}
            {others.map((c) => (
              <ConnectionItem
                key={c.id}
                connection={c}
                onEdit={onEdit}
                connected={connectedConnectionIds.has(c.id)}
                onConnectedChange={(connected) =>
                  setConnectionConnected(c.id, connected)
                }
              />
            ))}
          </>
        )}
      </div>
    </ScrollArea>
  );
}
