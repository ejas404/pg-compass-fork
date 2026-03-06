import { Database, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function Sidebar() {
  return (
    <aside className="flex h-full w-64 min-w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <SidebarHeader />
      <Separator className="bg-sidebar-border" />
      <SidebarContent />
      <Separator className="bg-sidebar-border" />
      <SidebarFooter />
    </aside>
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

function SidebarContent() {
  return (
    <ScrollArea className="flex-1">
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

function SidebarFooter() {
  return (
    <div className="p-3">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="sm" className="w-full gap-2">
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
