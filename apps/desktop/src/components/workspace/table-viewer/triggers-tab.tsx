import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSettings } from "@/hooks/use-settings";
import type { TriggerInfo } from "@/shared/types/table-data";

interface TriggersTabProps {
  connectionId: string;
  schema: string;
  table: string;
}

function enabledLabel(trigger: TriggerInfo): string {
  if (!trigger.enabled) {
    return "Disabled";
  }

  if (trigger.enabledMode === "ORIGIN") {
    return "Enabled";
  }

  return trigger.enabledMode;
}

export function TriggersTab({
  connectionId,
  schema,
  table,
}: Readonly<TriggersTabProps>) {
  const { settings } = useSettings();
  const [triggers, setTriggers] = useState<TriggerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingTrigger, setPendingTrigger] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const result = await globalThis.window.tableDataApi.getTriggers({
        connectionId,
        schema,
        table,
      });
      if (!result.success || !result.data) {
        toast.error("Failed to load triggers", { description: result.error });
        return;
      }
      setTriggers(result.data);
    } catch (err) {
      toast.error("Failed to load triggers", {
        description: (err as Error).message,
      });
    } finally {
      setLoading(false);
    }
  }, [connectionId, schema, table]);

  useEffect(
    function loadTriggers() {
      fetch();
    },
    [fetch],
  );

  async function handleToggle(trigger: TriggerInfo, enabled: boolean) {
    setPendingTrigger(trigger.name);
    try {
      const result = await globalThis.window.tableDataApi.toggleTrigger({
        connectionId,
        schema,
        table,
        trigger: trigger.name,
        enabled,
      });
      if (!result.success || !result.data) {
        toast.error("Failed to update trigger", { description: result.error });
        return;
      }
      setTriggers(result.data);
      toast.success(enabled ? "Trigger enabled" : "Trigger disabled");
    } catch (err) {
      toast.error("Failed to update trigger", {
        description: (err as Error).message,
      });
    } finally {
      setPendingTrigger(null);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (triggers.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No triggers found on this table.
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-card">
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Enabled</TableHead>
            <TableHead>Timing</TableHead>
            <TableHead>Events</TableHead>
            <TableHead>Function</TableHead>
            <TableHead>Definition</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {triggers.map((trigger) => (
            <TableRow key={trigger.name} className="hover:bg-muted/50">
              <TableCell className="font-medium">{trigger.name}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={trigger.enabled}
                    disabled={
                      settings.general.readOnlyMode ||
                      pendingTrigger === trigger.name
                    }
                    aria-label={`${trigger.enabled ? "Disable" : "Enable"} trigger ${trigger.name}`}
                    onCheckedChange={(checked) => {
                      handleToggle(trigger, checked).catch(() => undefined);
                    }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {pendingTrigger === trigger.name
                      ? "Updating"
                      : enabledLabel(trigger)}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className="font-mono text-[10px]">
                  {trigger.timing}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {trigger.events.map((event) => (
                    <Badge
                      key={event}
                      variant="outline"
                      className="font-mono text-[10px]"
                    >
                      {event}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {trigger.functionName}
              </TableCell>
              <TableCell className="max-w-100 truncate font-mono text-[10px] text-muted-foreground">
                <span title={trigger.definition}>{trigger.definition}</span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
