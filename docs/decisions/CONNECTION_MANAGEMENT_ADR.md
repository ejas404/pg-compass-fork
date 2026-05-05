# ADR: Connection Management Architecture

## Title

Type-safe IPC connection management with electron-store persistence

## Status

Accepted

## Decision

Connection management is implemented using a layered architecture across Electron's process boundaries:

1. **Shared types** in `src/shared/types/` — used by all three processes (main, preload, renderer).
2. **electron-store v8** for JSON persistence of connections on disk.
3. **ipcMain.handle / ipcRenderer.invoke** pattern for all CRUD operations.
4. **contextBridge** to expose a typed `connectionApi` to the renderer.
5. **React context** (`ConnectionProvider`) to manage state and provide hooks.
6. **pg (node-postgres)** imported only in main process for test connections.
7. **Main-process file dialogs** for connection certificate/key selection, exposed through typed IPC rather than renderer filesystem access.

## Rationale

- **electron-store v8** chosen over v11 because v11 is ESM-only, incompatible with the project's CJS tsconfig. v8 is stable and well-tested.
- **IPC result type** `{ success, data?, error? }` used across all handlers to preserve error context (Electron only serializes `Error.message`).
- **pg externalised** in `vite.main.config.ts` because node-postgres uses native bindings and circular dependency patterns that don't bundle with Vite/Rollup.
- **Sonner** chosen for toast notifications — lightweight, composable, dark-mode compatible with shadcn.

## Consequences

- All connection operations go through IPC — renderer has zero direct Node.js access.
- SSL certificate/key paths are persisted as paths, then read in the main process before constructing `pg` clients because node-postgres expects the file contents.
- Connection passwords are stored in plaintext in electron-store JSON. A future task should add encryption or use the OS keychain.
- SSH tunnel support is persisted in the schema but not yet wired to an actual tunnelling library (e.g., `ssh2`).
