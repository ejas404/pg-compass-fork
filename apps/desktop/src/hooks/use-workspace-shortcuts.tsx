import { useEffect, useRef } from 'react';
import type { WorkspaceTab } from '@/shared/types/workspace';

export function useWorkspaceShortcuts(
  tabs: WorkspaceTab[],
  activeTabId: string | null,
  closeTab: (id: string) => void,
  setActiveTab: (id: string) => void,
) {
  // Stable refs to avoid stale closures in IPC callbacks
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;
  const activeTabIdRef = useRef(activeTabId);
  activeTabIdRef.current = activeTabId;

  // IPC-driven shortcuts: Ctrl+W, Ctrl+Tab, Ctrl+Shift+Tab
  useEffect(function setupTabShortcuts() {
    const removeClose = globalThis.window.workspaceApi.onCloseTab(() => {
      const id = activeTabIdRef.current;
      if (id) closeTab(id);
    });

    const removeNext = globalThis.window.workspaceApi.onNextTab(() => {
      const t = tabsRef.current;
      if (t.length === 0) return;
      const idx = t.findIndex((tab) => tab.id === activeTabIdRef.current);
      if (idx < 0) return;
      const nextTab = t[(idx + 1) % t.length];
      if (nextTab) setActiveTab(nextTab.id);
    });

    const removePrev = globalThis.window.workspaceApi.onPrevTab(() => {
      const t = tabsRef.current;
      if (t.length === 0) return;
      const idx = t.findIndex((tab) => tab.id === activeTabIdRef.current);
      if (idx < 0) return;
      const prevTab = t[(idx - 1 + t.length) % t.length];
      if (prevTab) setActiveTab(prevTab.id);
    });

    return () => {
      removeClose();
      removeNext();
      removePrev();
    };
  }, [closeTab, setActiveTab]);
}