import {
  useEffect,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/hooks/use-workspace';
import { useWorkspaceShortcuts } from '@/hooks/use-workspace-shortcuts';
import { SchemaViewer } from '@/components/workspace/schema-viewer';
import { SchemaListViewer } from '@/components/workspace/schema-list-viewer';
import { TableListViewer } from '@/components/workspace/table-list-viewer';
import { TableDetailsViewer } from '@/components/workspace/table-details-viewer';
import { ViewListViewer } from '@/components/workspace/view-list-viewer';
import { ViewDetailsViewer } from '@/components/workspace/view-details-viewer';
import type { WorkspaceTab, WorkspaceTabView } from '@/shared/types/workspace';
import { WelcomeScreen } from './welcome-screen';
import { ApplicationTitle } from '../topbar/application-title';
import { buildWindowTitle } from './utils/build-window-title';

export function Workspace() {
  const { tabs, activeTabId, setActiveTab, closeTab } = useWorkspace();
  const activeTab = tabs.find((t) => t.id === activeTabId)

  useWorkspaceShortcuts(tabs, activeTabId, closeTab, setActiveTab);

  // Ctrl+F / Cmd+F: focus the visible query editor (if any)
  useEffect(function setupGlobalSearchShortcut() {
    function handleKeyDown(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod || e.key !== 'f') return;

      // Don't interfere if already inside a CodeMirror editor (let CM handle its own search)
      if (document.activeElement?.closest('.cm-editor')) return;

      const editor = document.querySelector(
        '[data-query-editor] .cm-content',
      );
      if (editor instanceof HTMLElement) {
        e.preventDefault();
        editor.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      <ApplicationTitle>{buildWindowTitle(activeTab?.view)}</ApplicationTitle>
      <WorkspaceTabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onSelectTab={setActiveTab}
        onCloseTab={closeTab}
      />
      {tabs.length === 0 ? (
        <WelcomeScreen />
      ) : (
        <WorkspaceTabPanels tabs={tabs} activeTabId={activeTabId} />
      )}
    </main>
  );
}

function WorkspaceTabBar({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
}: Readonly<{
  tabs: ReturnType<typeof useWorkspace>['tabs'];
  activeTabId: string | null;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
}>) {
  if (tabs.length === 0) {
    return (
      <div className="flex h-10 min-h-10 items-center border-b border-border bg-card px-3">
        <span className="text-xs text-muted-foreground">No tabs open</span>
      </div>
    );
  }

  return (
    <div className="workspace-tab-scrollbar flex h-10 min-h-10 items-end gap-1 overflow-x-auto overflow-y-hidden border-b border-border bg-card px-2 pt-1">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        const tabStyle = getTabStyle(tab.color, isActive);

        function handleTabAuxClick(e: ReactMouseEvent<HTMLDivElement>) {
          if (e.button !== 1) return;

          e.preventDefault();
          onCloseTab(tab.id);
        }

        function handleTabMouseDown(e: ReactMouseEvent<HTMLDivElement>) {
          if (e.button === 1) {
            e.preventDefault();
          }
        }

        return (
          <div
            key={tab.id}
            title={tab.title}
            className={cn(
              'group flex h-7 w-44 min-w-32 max-w-44 shrink-0 items-center gap-1 rounded-t-md border border-transparent px-2 text-xs',
              isActive
                ? 'border-border border-b-card bg-background text-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
            style={tabStyle}
            onClick={() => onSelectTab(tab.id)}
            onMouseDown={handleTabMouseDown}
            onAuxClick={handleTabAuxClick}
          >
            <button
              type="button"
              className="h-full min-w-0 flex-1 cursor-pointer truncate text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={(e) => {
                e.stopPropagation();
                onSelectTab(tab.id);
              }}
            >
              {tab.title}
            </button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-5 shrink-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
              aria-label={`Close ${tab.title}`}
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(tab.id);
              }}
            >
              <X className="size-3" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}

function getTabStyle(color: string | undefined, isActive: boolean): CSSProperties | undefined {
  if (!color) return undefined;

  return {
    backgroundColor: `color-mix(in oklab, ${color} ${isActive ? '20%' : '12%'}, transparent)`,
    borderColor: isActive
      ? `color-mix(in oklab, ${color} 55%, var(--border))`
      : `color-mix(in oklab, ${color} 30%, transparent)`,
  };
}


function WorkspaceTabPanels({
  tabs,
  activeTabId,
}: Readonly<{
  tabs: WorkspaceTab[];
  activeTabId: string | null;
}>) {
  return (
    <div className="relative flex-1 overflow-hidden">
      {tabs.map((tab) => (
        <TabPanel key={tab.id} tab={tab} isActive={tab.id === activeTabId} />
      ))}
    </div>
  );
}

function TabPanel({
  tab,
  isActive,
}: Readonly<{
  tab: WorkspaceTab;
  isActive: boolean;
}>) {
  return (
    <div
      className={cn(
        'absolute inset-0',
        isActive ? 'z-10 visible' : 'z-0 invisible',
      )}
      aria-hidden={!isActive}
    >
      <TabViewRenderer view={tab.view} />
    </div>
  );
}

function TabViewRenderer({ view }: Readonly<{ view: WorkspaceTabView }>) {
  if (view.type === 'schema') {
    return <SchemaViewer path={view.path} />;
  }

  if (view.type === 'schema-list') {
    return <SchemaListViewer path={view.path} />;
  }

  if (view.type === 'table-list') {
    return <TableListViewer path={view.path} />;
  }

  if (view.type === 'table-details') {
    return <TableDetailsViewer path={view.path} />;
  }

  if (view.type === 'view-list') {
    return <ViewListViewer path={view.path} />;
  }

  if (view.type === 'view-details') {
    return <ViewDetailsViewer path={view.path} />;
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-background">
      <span className="text-sm text-muted-foreground">Unsupported viewer type.</span>
    </div>
  );
}
