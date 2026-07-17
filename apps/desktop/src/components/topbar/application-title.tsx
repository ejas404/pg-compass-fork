import { useEffect } from "react";

/**
 * Sets the application window title.
 */
export function ApplicationTitle({ children }: { children: string }) {
  useEffect(() => {
    document.title = children;
  }, [children]);

  return null;
}
