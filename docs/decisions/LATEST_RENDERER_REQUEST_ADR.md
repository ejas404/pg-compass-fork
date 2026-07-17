# Latest Renderer Request ADR

## Description

Relation viewers issue IPC reads that can overlap when a user refreshes or changes the active relation.

## Decision

Use the renderer-local `useLatestRequest` hook for asynchronous relation reads and mutations whose UI state should reflect only the newest request started by that component.

## Rationale

IPC requests are not generally cancellable once sent to the main process. Ignoring stale completions prevents older results, errors, toasts, and loading transitions from overwriting newer UI state without introducing a server-state library.

## Status

Accepted

## Consequences

The main process may still complete superseded work. New renderer loaders must use the hook when overlapping requests are possible, and all post-await UI updates must occur only for a current result.
