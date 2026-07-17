import type { ReactNode } from "react";
import { ChevronRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WorkspaceTabView } from "@/shared/types/workspace";

interface BreadcrumbItem {
  label: string;
  view?: WorkspaceTabView;
}

interface ViewerShellProps {
  breadcrumb: BreadcrumbItem[];
  onNavigateToView?: (view: WorkspaceTabView) => void;
  onRefresh: () => void;
  refreshDisabled?: boolean;
  refreshing?: boolean;
  lastRefreshedAt?: Date | null;
  refreshLabel?: string;
  children: ReactNode;
}

export function ViewerShell({
  breadcrumb,
  onNavigateToView,
  onRefresh,
  refreshDisabled,
  refreshing = false,
  lastRefreshedAt,
  refreshLabel = "Refresh visible content",
  children,
}: Readonly<ViewerShellProps>) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
        <nav
          className="flex min-w-0 items-center gap-1.5"
          aria-label="Breadcrumb"
        >
          {breadcrumb.map((item, index) => {
            const key = `${item.label}-${String(index)}`;
            const targetView = item.view;
            const canNavigate = Boolean(targetView && onNavigateToView);
            const handleClick =
              targetView && onNavigateToView
                ? () => onNavigateToView(targetView)
                : undefined;

            return (
              <div key={key} className="flex min-w-0 items-center gap-1.5">
                {index > 0 && (
                  <ChevronRight className="size-3 text-muted-foreground" />
                )}
                <button
                  type="button"
                  className="max-w-48 truncate text-sm text-muted-foreground hover:text-foreground disabled:cursor-default"
                  onClick={handleClick}
                  disabled={!canNavigate}
                >
                  {item.label}
                </button>
              </div>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {lastRefreshedAt ? (
            <span
              className="text-[10px] text-muted-foreground"
              title={lastRefreshedAt.toLocaleString()}
            >
              Updated{" "}
              {lastRefreshedAt.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={onRefresh}
            disabled={refreshDisabled || refreshing}
            data-view-refresh
            title={refreshLabel}
            aria-label={refreshLabel}
          >
            <RefreshCw
              className={`size-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
            {refreshing ? "Refreshing" : "Refresh"}
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 p-4">{children}</div>
    </div>
  );
}
