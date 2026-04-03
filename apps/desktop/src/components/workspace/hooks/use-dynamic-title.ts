import { WorkspaceTab, WorkspaceTabView } from "@/shared/types";
import { useEffect } from "react";

function buildWindowTitle(view: WorkspaceTabView | undefined): string {
  const base = 'PG Compass';
  if (!view) return base;

  const label = view.path.connectionLabel;

  if (view.type === 'schema-list') return `${base} - ${label}`;

  const schema = view.path.schemaName;

  if (view.type === 'schema') return `${base} - ${label}/${schema}`;

  if (view.type === 'table-list' || view.type === 'table-details')
    return `${base} - ${label}/${schema}/${view.path.tableName}`;

  // view-list or view-details
  return `${base} - ${label}/${schema}/${view.path.viewName}`;
}

/**
 * Dynamically updates the window title based on the active workspace tab.
 * @example `PG Compass - My Connection/My Schema/My Table`
 * @param activeTab The currently active workspace tab, or undefined if no tabs are open.
 */
export function useDynamicWindowTitle(activeTab: WorkspaceTab | undefined) {
  useEffect(function updateWindowTitle() {
    document.title = buildWindowTitle(activeTab?.view);
  }, [activeTab]);
}