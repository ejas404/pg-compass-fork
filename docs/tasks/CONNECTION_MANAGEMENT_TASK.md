# Task: Connection Management

> **Status:** Implemented

"New Connection" in the sidebar can be used to create a new connection. A modal is shown with form that accepts the following fields:

1. **URI**: The connection URI for the PostgreSQL database.
2. **Label**: A user-friendly name for the connection.
3. **Color**: An optional color to associate with the connection for easy identification.

An "Advanced Configuration" section can be toggled to show additional fields for manual entry of connection parameters or SSL and SSH configurations. Expand possibilities based on what `node-postgres` supports.

A connection should be persisted to local storage (use `electron-store` for this) so that it is available across app restarts. Connections can be edited or deleted from the sidebar. A connection can also be favourited for quick access.

If a color is associated with a connection, the sidebar entry should be tinted with that color to make it visually easier to identify.

**Sidebar:**

Connections are available in the sidebar. A "Connect" button is visible on hover, which can be clicked to establish a connection. We do not have to implement the actual connection logic as of yet, but we can simulate it with a loading state and failed toast for now. Once a connection is established, it can be expanded (it works like an accordion) to show the database schemas. The schemas can be expanded to show the tables which is as far as the sidebar goes. Do not do dummy expansion for now, just show a loading state for a couple of seconds to simulate fetching schemas and tables. We will implement the actual fetching logic in the next task.

---

## Implementation Details

### Architecture

- **Main process** (`src/main/`): Handles IPC, connection persistence via `electron-store`, and PostgreSQL connectivity via `pg` (node-postgres).
- **Preload** (`src/preload.ts`): Exposes a typed `connectionApi` via `contextBridge`.
- **Renderer** (`src/components/connections/`, `src/hooks/`): React context + provider for state, dialog for creating/editing connections, sidebar integration.

### Files Created / Modified

| File | Purpose |
|------|---------|
| `src/shared/types/connection.ts` | Shared TypeScript types (`ConnectionConfig`, `ConnectionInput`, SSL/SSH configs, IPC channel constants) |
| `src/main/connection-store.ts` | `electron-store` v8 persistence layer (CRUD + toggle favourite) |
| `src/main/connection-ipc.ts` | `ipcMain.handle` registrations for all connection channels, includes `pg` test connection |
| `src/preload.ts` | `contextBridge.exposeInMainWorld('connectionApi', ...)` with typed wrappers |
| `src/electron.d.ts` | Global `Window.connectionApi` type declaration |
| `src/hooks/use-connections.tsx` | React context + `useConnections()` hook with full CRUD operations |
| `src/components/connections/ConnectionFormDialog.tsx` | Modal for creating/editing connections (URI or fields, color picker, advanced SSL/SSH) |
| `src/components/connections/ConnectionItem.tsx` | Sidebar list item with connect, expand, edit, favourite, delete |
| `src/components/ui/label.tsx` | shadcn Label component |
| `src/components/ui/sonner.tsx` | Sonner toast wrapper |
| `src/components/ui/collapsible.tsx` | Radix Collapsible component |
| `src/components/sidebar/Sidebar.tsx` | Updated to render connections, categorised into favourites + others |
| `src/app/App.tsx` | Wrapped with `ConnectionProvider` and `Toaster` |
| `src/main.ts` | Registers IPC handlers on startup |
| `vite.main.config.ts` | Externalises `pg`, `pg-native`, `electron-store` for main process bundling |

### Dependencies Added

- `pg` + `@types/pg` — PostgreSQL client
- `electron-store@8` — Persistent storage (CJS-compatible)
- `sonner` — Toast notifications
