import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  useSidebarResize,
  SIDEBAR_MIN_WIDTH,
} from "@/hooks/use-sidebar-resize";
import { useSidebarState } from "@/hooks/use-sidebar-state";
import { ConnectionFormDialog } from "@/components/connections/ConnectionFormDialog";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { matchesShortcut } from "@/shared/constants/shortcuts";
import { SidebarHeader } from "./SidebarHeader";
import { SidebarContent } from "./SidebarContent";
import { SidebarFooter } from "./SidebarFooter";

export function Sidebar() {
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const { sidebarWidth, sidebarRef, handleResizeStart, maxSidebarWidth } =
    useSidebarResize();
  const {
    formOpen,
    setFormOpen,
    settingsOpen,
    setSettingsOpen,
    editingConnection,
    handleOpenCreate,
    handleEdit,
    handleOpenSettings,
  } = useSidebarState();

  useEffect(function setupSidebarSearchShortcut() {
    function handleKeyDown(event: KeyboardEvent) {
      if (!matchesShortcut("sidebar-search", event)) return;
      if (document.activeElement?.closest(".cm-editor")) return;
      event.preventDefault();
      searchRef.current?.focus();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <aside
        ref={sidebarRef}
        className="relative flex h-full min-h-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
        style={{
          width: `${sidebarWidth}px`,
          minWidth: `${SIDEBAR_MIN_WIDTH}px`,
          maxWidth: `${maxSidebarWidth}px`,
        }}
      >
        <SidebarHeader onOpenSettings={handleOpenSettings} />
        <div className="relative px-3 pb-2">
          <Search className="pointer-events-none absolute left-5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape" && search) {
                event.preventDefault();
                setSearch("");
              }
            }}
            placeholder="Search connections and relations"
            aria-label="Search sidebar"
            className="h-8 bg-sidebar-accent/30 pl-8 pr-8 text-xs"
          />
          {search ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute right-4 top-1/2 size-6 -translate-y-1/2"
              aria-label="Clear sidebar search"
              onClick={() => {
                setSearch("");
                searchRef.current?.focus();
              }}
            >
              <X className="size-3" />
            </Button>
          ) : null}
        </div>
        <Separator className="bg-sidebar-border" />
        <SidebarContent search={search} onEdit={handleEdit} />
        <Separator className="bg-sidebar-border" />
        <SidebarFooter onNewConnection={handleOpenCreate} />
        <button
          type="button"
          aria-label="Resize sidebar"
          className="absolute inset-y-0 right-0 z-20 w-1 cursor-col-resize bg-transparent transition-colors hover:bg-sidebar-primary/40"
          onPointerDown={handleResizeStart}
        />
      </aside>

      <ConnectionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editConnection={editingConnection}
      />

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
