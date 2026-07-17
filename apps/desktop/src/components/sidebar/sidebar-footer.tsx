import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function SidebarFooter({
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
