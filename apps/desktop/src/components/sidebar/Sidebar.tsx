import { useState } from 'react';
import { Database, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useConnections } from '@/hooks/use-connections';
import { ConnectionItem } from '@/components/connections/ConnectionItem';
import { ConnectionFormDialog } from '@/components/connections/ConnectionFormDialog';
import type { ConnectionConfig } from '@/shared/types/connection';

export function Sidebar() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<
    ConnectionConfig | undefined
  >(undefined);

  function handleOpenCreate() {
    setEditingConnection(undefined);
    setFormOpen(true);
  }

  function handleEdit(connection: ConnectionConfig) {
    setEditingConnection(connection);
    setFormOpen(true);
  }

  return (
    <>
      <aside className="flex h-full min-h-0 w-64 min-w-64 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <SidebarHeader />
        <Separator className="bg-sidebar-border" />
        <SidebarContent onEdit={handleEdit} />
        <Separator className="bg-sidebar-border" />
        <SidebarFooter onNewConnection={handleOpenCreate} />
      </aside>

      <ConnectionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editConnection={editingConnection}
      />
    </>
  );
}

function SidebarHeader() {
  return (
    <div className="flex items-center gap-2 px-4 py-3">
      <Database className="size-4 text-sidebar-primary" />
      <h1 className="text-sm font-semibold tracking-tight">PG Compass</h1>
    </div>
  );
}

function SidebarContent({ onEdit }: Readonly<{ onEdit: (c: ConnectionConfig) => void }>) {
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

function SidebarFooter({
  onNewConnection,
}: Readonly<{
  onNewConnection: () => void;
}>) {
  return (
    <div className="mt-auto p-3">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={onNewConnection}
          >
            <Plus className="size-4" />
            <span>New Connection</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Add a new PostgreSQL connection</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
