import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useSettings } from "@/hooks/use-settings";

const SIDEBAR_DEFAULT_WIDTH = 256;
const SIDEBAR_MIN_WIDTH = 240;
const SIDEBAR_MAX_VIEWPORT_RATIO = 0.45;

export { SIDEBAR_MIN_WIDTH };

function getMaxSidebarWidth() {
  return Math.max(
    SIDEBAR_MIN_WIDTH,
    Math.floor(globalThis.innerWidth * SIDEBAR_MAX_VIEWPORT_RATIO),
  );
}

function clampSidebarWidth(width: number) {
  return Math.min(Math.max(width, SIDEBAR_MIN_WIDTH), getMaxSidebarWidth());
}

export function useSidebarResize() {
  const { settings, loading, updateSettings } = useSettings();
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLElement | null>(null);
  const sidebarWidthRef = useRef(SIDEBAR_DEFAULT_WIDTH);

  useEffect(
    function handleResizeEvents() {
      if (!isResizing) {
        return;
      }

      function handlePointerMove(event: PointerEvent) {
        const sidebarLeft =
          sidebarRef.current?.getBoundingClientRect().left ?? 0;
        const nextWidth = clampSidebarWidth(event.clientX - sidebarLeft);

        sidebarWidthRef.current = nextWidth;
        setSidebarWidth(nextWidth);
      }

      function handlePointerUp() {
        setIsResizing(false);
        const nextWidth = Math.round(sidebarWidthRef.current);
        if (nextWidth !== settings.appearance.sidebarWidth) {
          updateSettings({ appearance: { sidebarWidth: nextWidth } }).catch(
            () => undefined,
          );
        }
      }

      const previousCursor = globalThis.document.body.style.cursor;
      const previousUserSelect = globalThis.document.body.style.userSelect;
      globalThis.document.body.style.cursor = "col-resize";
      globalThis.document.body.style.userSelect = "none";

      globalThis.addEventListener("pointermove", handlePointerMove);
      globalThis.addEventListener("pointerup", handlePointerUp);

      return () => {
        globalThis.removeEventListener("pointermove", handlePointerMove);
        globalThis.removeEventListener("pointerup", handlePointerUp);
        globalThis.document.body.style.cursor = previousCursor;
        globalThis.document.body.style.userSelect = previousUserSelect;
      };
    },
    [isResizing, settings.appearance.sidebarWidth, updateSettings],
  );

  useEffect(function handleWindowResize() {
    function handleWindowResize() {
      setSidebarWidth((current) => {
        const nextWidth = clampSidebarWidth(current);
        sidebarWidthRef.current = nextWidth;
        return nextWidth;
      });
    }

    globalThis.addEventListener("resize", handleWindowResize);

    return () => {
      globalThis.removeEventListener("resize", handleWindowResize);
    };
  }, []);

  useEffect(
    function loadPersistedWidth() {
      if (loading) {
        return;
      }

      const persistedWidth =
        settings.appearance.sidebarWidth ?? SIDEBAR_DEFAULT_WIDTH;
      const nextWidth = clampSidebarWidth(persistedWidth);
      sidebarWidthRef.current = nextWidth;
      setSidebarWidth(nextWidth);
    },
    [loading, settings.appearance.sidebarWidth],
  );

  function handleResizeStart(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    setIsResizing(true);
  }

  const maxSidebarWidth = getMaxSidebarWidth();

  return {
    sidebarWidth,
    sidebarRef,
    handleResizeStart,
    maxSidebarWidth,
  };
}
