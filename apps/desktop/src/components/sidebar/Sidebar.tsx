import { Separator } from '@/components/ui/separator';
import { useSidebarResize, SIDEBAR_MIN_WIDTH } from '@/hooks/use-sidebar-resize';
import { useSidebarState } from '@/hooks/use-sidebar-state';
import { ConnectionFormDialog } from '@/components/connections/ConnectionFormDialog';
import { SettingsDialog } from '@/components/settings/SettingsDialog';
import { SidebarHeader } from './SidebarHeader';
import { SidebarContent } from './SidebarContent';
import { SidebarFooter } from './SidebarFooter';

export function Sidebar() {
  const { sidebarWidth, sidebarRef, handleResizeStart, maxSidebarWidth } = useSidebarResize();
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
        <Separator className="bg-sidebar-border" />
        <SidebarContent onEdit={handleEdit} />
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
