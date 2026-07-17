import { Database, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function SidebarHeader({
  onOpenSettings,
}: Readonly<{
  onOpenSettings: () => void;
}>) {
  return (
    <div className="flex items-center gap-2 px-4 py-3">
      <Database className="size-4 text-sidebar-primary" />
      <h1 className="flex-1 text-sm font-semibold tracking-tight">
        PG Compass
      </h1>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-foreground"
            aria-label="Open settings"
            onClick={onOpenSettings}
          >
            <Settings className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Settings</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
