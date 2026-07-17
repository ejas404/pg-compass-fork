import { useState } from "react";
import { Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  SHORTCUTS,
  currentShortcutPlatform,
  shortcutLabel,
} from "@/shared/constants/shortcuts";

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: Readonly<KeyboardShortcutsDialogProps>) {
  const [search, setSearch] = useState("");
  const platform = currentShortcutPlatform();
  const query = search.trim().toLowerCase();
  const visible = query
    ? SHORTCUTS.filter((shortcut) =>
        `${shortcut.label} ${shortcut.category} ${shortcutLabel(shortcut, platform)}`
          .toLowerCase()
          .includes(query),
      )
    : SHORTCUTS;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg"
        onKeyDown={(event) => {
          if (
            event.target instanceof Element &&
            event.target.closest(".cm-editor")
          ) {
            event.stopPropagation();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Search the shortcuts available in the current platform.
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search shortcuts"
            className="h-8 pl-8 text-xs"
          />
        </div>
        <div className="max-h-80 overflow-y-auto rounded-md border border-border">
          {visible.length === 0 ? (
            <p className="p-4 text-center text-xs text-muted-foreground">
              No shortcuts match.
            </p>
          ) : (
            visible.map((shortcut) => (
              <div
                key={shortcut.id}
                className="flex items-center justify-between gap-4 border-b border-border px-3 py-2 last:border-b-0"
              >
                <div>
                  <p className="text-sm">{shortcut.label}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {shortcut.category}
                  </p>
                </div>
                <kbd className="rounded border border-border bg-muted px-2 py-1 font-mono text-[10px]">
                  {shortcutLabel(shortcut, platform)}
                </kbd>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
