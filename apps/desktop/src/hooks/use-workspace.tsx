import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';
import { useConnections } from '@/hooks/use-connections';
import { useSettings } from '@/hooks/use-settings';
import type { DatabaseSchema } from '@/shared/types/connection';
import type {
  DatabaseViewerPath,
  SchemaViewerPath,
  TableListViewerPath,
  ViewListViewerPath,
  WorkspaceTab,
  WorkspaceTabView,
} from '@/shared/types/workspace';

interface WorkspaceContextValue {
  tabs: WorkspaceTab[];
  activeTabId: string | null;
  schemaCache: Record<string, DatabaseSchema[]>;
  setActiveTab: (id: string) => void;
  closeTab: (id: string) => void;
  openSchemaListViewer: (path: DatabaseViewerPath, color?: string) => Promise<void>;
  openSchemaViewer: (path: SchemaViewerPath, color?: string) => Promise<void>;
  openTableListViewer: (path: TableListViewerPath, color?: string) => Promise<void>;
  openTableDetailsViewer: (path: TableListViewerPath, color?: string) => Promise<void>;
  openViewListViewer: (path: ViewListViewerPath, color?: string) => Promise<void>;
  navigateToView: (view: WorkspaceTabView) => Promise<void>;
  refreshSchemaTree: (connectionId: string, force?: boolean) => Promise<DatabaseSchema[]>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function buildSchemaTabId(path: SchemaViewerPath): string {
  return `${path.connectionId}:schema:${path.schemaName}`;
}

function buildSchemaListTabId(path: DatabaseViewerPath): string {
  return `${path.connectionId}:schema-list`;
}

function buildTableListTabId(path: TableListViewerPath): string {
  return `${path.connectionId}:table-list:${path.schemaName}:${path.tableName}`;
}

function buildTableDetailsTabId(path: TableListViewerPath): string {
  return `${path.connectionId}:table-details:${path.schemaName}:${path.tableName}`;
}

function buildViewListTabId(path: ViewListViewerPath): string {
  return `${path.connectionId}:view-list:${path.schemaName}:${path.viewName}`;
}

function buildTabId(view: WorkspaceTabView): string {
  if (view.type === 'schema-list') {
    return buildSchemaListTabId(view.path);
  }

  if (view.type === 'schema') {
    return buildSchemaTabId(view.path);
  }

  if (view.type === 'table-list') {
    return buildTableListTabId(view.path);
  }

  if (view.type === 'table-details') {
    return buildTableDetailsTabId(view.path);
  }

  return buildViewListTabId(view.path);
}

function buildTabTitle(view: WorkspaceTabView): string {
  if (view.type === 'schema-list') {
    return view.path.connectionLabel;
  }

  if (view.type === 'schema') {
    return view.path.schemaName;
  }

  if (view.type === 'table-list' || view.type === 'table-details') {
    return view.path.tableName;
  }

  return view.path.viewName;
}

function buildWorkspaceTab(view: WorkspaceTabView, color?: string): WorkspaceTab {
  return {
    id: buildTabId(view),
    title: buildTabTitle(view),
    color,
    view,
  };
}

export function WorkspaceProvider({ children }: Readonly<{ children: ReactNode }>) {
  const { getSchemaTree } = useConnections();
  const { settings } = useSettings();
  const [tabs, setTabs] = useState<WorkspaceTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [schemaCache, setSchemaCache] = useState<Record<string, DatabaseSchema[]>>({});

  const refreshSchemaTree = useCallback(
    async (connectionId: string, force = false): Promise<DatabaseSchema[]> => {
      if (!force && schemaCache[connectionId]) {
        return schemaCache[connectionId];
      }

      const result = await getSchemaTree(connectionId, {
        includeInternalSchemas: !settings.general.hideInternalSchemas,
      });

      if (!result.ok || !result.data) {
        toast.error('Failed to load schema tree', {
          description: result.error,
        });
        return [];
      }

      setSchemaCache((prev) => ({
        ...prev,
        [connectionId]: result.data ?? [],
      }));
      return result.data;
    },
    [getSchemaTree, schemaCache, settings.general.hideInternalSchemas],
  );

  const setActiveTab = useCallback((id: string) => {
    setActiveTabId(id);
  }, []);

  const closeTab = useCallback(
    (id: string) => {
      setTabs((prevTabs) => {
        const nextTabs = prevTabs.filter((tab) => tab.id !== id);
        if (activeTabId === id) {
          const fallback = nextTabs.at(-1);
          setActiveTabId(fallback?.id ?? null);
        }
        return nextTabs;
      });
    },
    [activeTabId],
  );

  const openSchemaViewer = useCallback(
    async (path: SchemaViewerPath, color?: string) => {
      await refreshSchemaTree(path.connectionId);

      const nextTab = buildWorkspaceTab(
        {
          type: 'schema',
          path,
        },
        color,
      );
      setTabs((prev) => {
        const existing = prev.find((tab) => tab.id === nextTab.id);
        if (existing) {
          return prev;
        }
        return [...prev, nextTab];
      });
      setActiveTabId(nextTab.id);
    },
    [refreshSchemaTree],
  );

  const openSchemaListViewer = useCallback(
    async (path: DatabaseViewerPath, color?: string) => {
      await refreshSchemaTree(path.connectionId);

      const nextTab = buildWorkspaceTab(
        {
          type: 'schema-list',
          path,
        },
        color,
      );
      setTabs((prev) => {
        const existing = prev.find((tab) => tab.id === nextTab.id);
        if (existing) {
          return prev;
        }
        return [...prev, nextTab];
      });
      setActiveTabId(nextTab.id);
    },
    [refreshSchemaTree],
  );

  const openTableListViewer = useCallback(
    async (path: TableListViewerPath, color?: string) => {
      await refreshSchemaTree(path.connectionId);

      const nextTab = buildWorkspaceTab(
        {
          type: 'table-list',
          path,
        },
        color,
      );
      setTabs((prev) => {
        const existing = prev.find((tab) => tab.id === nextTab.id);
        if (existing) {
          return prev;
        }
        return [...prev, nextTab];
      });
      setActiveTabId(nextTab.id);
    },
    [refreshSchemaTree],
  );

  const openTableDetailsViewer = useCallback(
    async (path: TableListViewerPath, color?: string) => {
      await refreshSchemaTree(path.connectionId);

      const nextTab = buildWorkspaceTab(
        {
          type: 'table-details',
          path,
        },
        color,
      );
      setTabs((prev) => {
        const existing = prev.find((tab) => tab.id === nextTab.id);
        if (existing) {
          return prev;
        }
        return [...prev, nextTab];
      });
      setActiveTabId(nextTab.id);
    },
    [refreshSchemaTree],
  );

  const openViewListViewer = useCallback(
    async (path: ViewListViewerPath, color?: string) => {
      await refreshSchemaTree(path.connectionId);

      const nextTab = buildWorkspaceTab(
        {
          type: 'view-list',
          path,
        },
        color,
      );
      setTabs((prev) => {
        const existing = prev.find((tab) => tab.id === nextTab.id);
        if (existing) {
          return prev;
        }
        return [...prev, nextTab];
      });
      setActiveTabId(nextTab.id);
    },
    [refreshSchemaTree],
  );

  const navigateToView = useCallback(
    async (view: WorkspaceTabView) => {
      await refreshSchemaTree(view.path.connectionId);

      const targetTabId = buildTabId(view);
      setTabs((prevTabs) => {
        const existingTargetTab = prevTabs.find((tab) => tab.id === targetTabId);
        if (existingTargetTab) {
          return prevTabs;
        }

        const activeIndex = activeTabId
          ? prevTabs.findIndex((tab) => tab.id === activeTabId)
          : -1;
        const fallbackColor = activeIndex >= 0 ? prevTabs[activeIndex]?.color : undefined;
        const nextTab = buildWorkspaceTab(view, fallbackColor);

        if (activeIndex < 0) {
          return [...prevTabs, nextTab];
        }

        return prevTabs.map((tab, index) => (index === activeIndex ? nextTab : tab));
      });

      setActiveTabId(targetTabId);
    },
    [activeTabId, refreshSchemaTree],
  );

  const value = useMemo(
    () => ({
      tabs,
      activeTabId,
      schemaCache,
      setActiveTab,
      closeTab,
      openSchemaListViewer,
      openSchemaViewer,
      openTableListViewer,
      openTableDetailsViewer,
      openViewListViewer,
      navigateToView,
      refreshSchemaTree,
    }),
    [
      tabs,
      activeTabId,
      schemaCache,
      setActiveTab,
      closeTab,
      openSchemaListViewer,
      openSchemaViewer,
      openTableListViewer,
      openTableDetailsViewer,
      openViewListViewer,
      navigateToView,
      refreshSchemaTree,
    ],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return ctx;
}
