import { useCallback, useEffect, useRef } from "react";

export type LatestRequestResult<T> =
  | { status: "current"; value: T }
  | { status: "stale" }
  | { status: "error"; error: unknown };

/** Keeps component state aligned with its most recently started IPC request. */
export function useLatestRequest() {
  const currentRequestRef = useRef(0);

  useEffect(
    () => () => {
      currentRequestRef.current += 1;
    },
    [],
  );

  return useCallback(
    async <T>(request: () => Promise<T>): Promise<LatestRequestResult<T>> => {
      const requestId = ++currentRequestRef.current;
      try {
        const value = await request();
        return requestId === currentRequestRef.current
          ? { status: "current", value }
          : { status: "stale" };
      } catch (error) {
        return requestId === currentRequestRef.current
          ? { status: "error", error }
          : { status: "stale" };
      }
    },
    [],
  );
}
