import { Database } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useConnections } from '@/hooks/use-connections';
import { ConnectionItem } from '@/components/connections/ConnectionItem';
import type { ConnectionConfig } from '@/shared/types/connection';

export function SidebarContent({ onEdit }: Readonly<{ onEdit: (c: ConnectionConfig) => void }>) {
  const { connections, loading } = useConnections();

  // Separate favourites from the rest
  const favourites = connections.filter((c) => c.favourite);
  const others = connections.filter((c) => !c.favourite);

  if (loading) {
    return (
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-2 px-3 py-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={`skeleton-${String(i)}`} className="flex items-center gap-2 px-2 py-1.5">
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

  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="flex flex-col gap-0.5 px-2 py-2">
        {favourites.length > 0 && (
          <>
            <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">
              Favourites
            </p>
            {favourites.map((c) => (
              <ConnectionItem key={c.id} connection={c} onEdit={onEdit} />
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
              <ConnectionItem key={c.id} connection={c} onEdit={onEdit} />
            ))}
          </>
        )}
      </div>
    </ScrollArea>
  );
}