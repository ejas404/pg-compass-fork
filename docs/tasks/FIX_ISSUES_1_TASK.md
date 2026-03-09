# Code Review: PG Compass

Overall the codebase is well-organized with clean IPC boundaries, proper `contextBridge` usage, and a coherent component structure. The findings below are ordered by severity.

## Implementation Progress

### MAJOR issues — All fixed ✅

| # | Issue | Status | Implementation |
|---|-------|--------|----------------|
| 4 | Duplicated `buildPgConfig` | ✅ Done | Extracted to `src/main/pg-utils.ts` along with `quoteIdent`. Both `connection-ipc.ts` and `table-data-ipc.ts` import from the shared module. |
| 5 | New `pg.Client` per IPC call | ✅ Done | Introduced `pg.Pool` via `withPoolClient()` in `pg-utils.ts`. One pool per connectionId (max 5 connections), lazily created, stored in a `Map`. Pools are destroyed on connection update/delete and on app quit (`destroyAllPools()` in `main.ts` `will-quit` event). |
| 6 | `schemaCache` cascading re-renders | ✅ Done | Replaced `schemaCache` in `refreshSchemaTree` deps with a `useRef`. The ref (`schemaCacheRef`) is kept in sync and read inside the callback, removing `schemaCache` from the dependency array. |
| 7 | `closeTab` stale `activeTabId` | ✅ Done | Added `activeTabIdRef` (synced via `useRef`) and read it inside `closeTab` and `navigateToView` callbacks instead of the closure value. Removed `activeTabId` from their dependency arrays. |
| 8 | `ConnectionItem` state never resets | ✅ Done | Added `handleDisconnect()` that resets `connected`, `expanded`, and `expandedSchemas`. Added a "Disconnect" menu item (with `PlugZap` icon) in the dropdown, visible only when connected. |
| 9 | Plaintext credential storage | ✅ Done | Added `safeStorage.encryptString()`/`decryptString()` in `connection-store.ts`. Passwords and URIs are encrypted with an `esafe:` prefix before storing and decrypted transparently on read. Falls back to plaintext if `safeStorage` is unavailable. Backward-compatible with existing unencrypted connections. |

---

## BLOCKING - Must fix

### 1. SQL Injection via raw `whereClause` passthrough

In table-data-ipc.ts, the user-supplied `whereClause` is interpolated directly into SQL:

```ts
const whereFragment = params.whereClause?.trim()
  ? `WHERE ${params.whereClause}`
  : '';
// ...
`SELECT count(*) AS count FROM ${qualifiedTable} ${whereFragment}`
```

Any string the user types in the Data tab filter is sent verbatim to PostgreSQL. This is dangerous even in a desktop app because:
- A connection to a production DB + a mistyped or malicious clause can execute destructive operations (e.g. `1=1; DROP TABLE ...` via stacked queries — though `pg` by default doesn't allow stacked queries, some edge cases exist).
- The `count` query and the `SELECT *` query both use it ungated.

**Fix:** Wrap the data-tab queries in a `BEGIN READ ONLY` transaction (just like `executeQuery` already does). This is the simplest defense. You're already doing it for the Query tab — apply the same pattern to `getRows`.

### 2. Explicitly set security-critical `webPreferences`

In main.ts, the `BrowserWindow` only specifies `preload`:

```ts
webPreferences: {
  preload: path.join(__dirname, 'preload.js'),
},
```

While Electron 40 **defaults** to `contextIsolation: true` and `nodeIntegration: false`, relying on implicit defaults for security-critical settings is fragile. If a future Electron version changes defaults or someone accidentally downgrades, the renderer gains full Node access.

**Fix:** Be explicit:
```ts
webPreferences: {
  preload: path.join(__dirname, 'preload.js'),
  nodeIntegration: false,
  contextIsolation: true,
  sandbox: true,
},
```

### 3. No navigation/window-open restrictions

The main process doesn't restrict navigation or new window creation. If a renderer link (e.g. the OpenStreetMap link in postgis-renderers.tsx) is clicked, it navigates the Electron window itself to an external site — effectively replacing your app.

**Fix:** Add handlers after window creation:
```ts
mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
mainWindow.webContents.on('will-navigate', (event, url) => {
  if (!url.startsWith(MAIN_WINDOW_VITE_DEV_SERVER_URL ?? '')) {
    event.preventDefault();
    shell.openExternal(url); // opens in default browser instead
  }
});
```

---

## MAJOR - Should fix

### 4. Duplicated `buildPgConfig` function

`buildPgConfig` is **copy-pasted** identically between connection-ipc.ts and table-data-ipc.ts. A DRY violation that will inevitably drift when one copy is updated and the other isn't.

**Fix:** Extract to a shared `main/pg-utils.ts` module. `quoteIdent`, `withClient`, and `buildPgConfig` all belong there.

### 5. New `pg.Client` created on every single IPC call

Every `getRows`, `getStructure`, `getIndexes`, `getConstraints`, and even the schema tree fetch creates a brand-new TCP connection to PostgreSQL, runs a query, and disconnects. For a data exploration tool where users are rapidly paginating and switching tabs, this creates massive latency and connection churn.

**Fix:** Use `pg.Pool` (already a dependency — `pg` ships it). One pool per active connection, lazily created, stored in a `Map<connectionId, Pool>`, disposed on app quit or disconnect. This is a significant performance win.

### 6. `refreshSchemaTree` has `schemaCache` in deps — cascading re-renders

In use-workspace.tsx, `refreshSchemaTree` includes `schemaCache` in its `useCallback` dependency array. Since `schemaCache` is an object that gets a new reference on every state update, **`refreshSchemaTree` gets a new identity on every cache change**, which cascades to all 6 `open*Viewer` callbacks that depend on it, re-creating every function in the context value every time any schema is fetched.

**Fix:** Use a ref to read the cache inside the callback:
```ts
const schemaCacheRef = useRef(schemaCache);
schemaCacheRef.current = schemaCache;

const refreshSchemaTree = useCallback(
  async (connectionId: string, force = false) => {
    if (!force && schemaCacheRef.current[connectionId]) {
      return schemaCacheRef.current[connectionId];
    }
    // ... rest unchanged
  },
  [getSchemaTree, settings.general.hideInternalSchemas], // no schemaCache
);
```

### 7. `closeTab` reads stale `activeTabId`

In use-workspace.tsx:
```ts
const closeTab = useCallback(
  (id: string) => {
    setTabs((prevTabs) => {
      const nextTabs = prevTabs.filter((tab) => tab.id !== id);
      if (activeTabId === id) { // <-- reads closure, may be stale
```

If multiple tabs are closed quickly, `activeTabId` in the closure may not reflect the latest state.

**Fix:** Either track `activeTabId` via a ref, or co-locate tabs and active tab in a single `useReducer` so state transitions are atomic.

### 8. `ConnectionItem` local `connected` state never resets

In ConnectionItem.tsx, once `setConnected(true)` is called, there's no mechanism to set it back to `false`. If the database goes down, the user sees a "connected" state with no ability to disconnect or re-test. There's also no disconnect button.

**Fix:** Add a "Disconnect" option in the dropdown menu that resets `connected`, `expanded`, `schemas`, etc. Also consider a periodic liveness check or at least resetting state on failed queries.

### 9. Plaintext credential storage

`electron-store` writes connection passwords and SSH credentials as plain JSON to disk. While this is common in dev tools (pgAdmin does similar), it's worth noting for production readiness.

**Suggestion:** Use Electron's `safeStorage.encryptString()` / `decryptString()` for password fields before storing. This leverages the OS keychain (macOS Keychain, Windows DPAPI, Linux Secret Service).

---

## MINOR - Can fix in follow-up

### 10. `formatEstimatedRowCount` duplicated

Identical function in schema-viewer.tsx and table-list-viewer.tsx. Should be in `lib/utils.ts`.

### 11. Dead code: `use-mobile.ts`

use-mobile.ts implements a mobile breakpoint hook. This is a desktop Electron app — this file is unused dead code. Remove it.

### 12. `productName` in package.json is `"desktop"`

In package.json, `productName` is `"desktop"`. The packaged app will appear as "desktop" in OS launchers, taskbars, and installers instead of "PG Compass".

### 13. TypeScript version mismatch

Root workspace uses `typescript: "5.9.2"`, but desktop package.json pins `"~4.5.4"`. This creates confusing behavior — VS Code uses the workspace version but the build uses the pinned old one. Consider aligning to the root version and removing the desktop-level TS dep.

### 14. Missing `strict: true` in tsconfig

tsconfig.json only enables `noImplicitAny`. Missing `strict: true` means no `strictNullChecks`, `noUncheckedIndexedAccess`, etc. For a project that handles nullable database values extensively, `strictNullChecks` would catch real bugs.

### 15. Phantom `vite.renderer.config.ts`

Both `vite.renderer.config.ts` and `vite.renderer.config.mts` exist. The forge config references `.mts`. The `.ts` file is dead.

### 16. `ExpandableVector` inconsistent with codebase patterns

In pgvector-renderers.tsx, `ExpandableVector` doesn't use `Readonly<>` on its props, unlike every other component in the codebase.

### 17. `navigateToView` reads stale `activeTabId`

Same issue as #7: use-workspace.tsx reads `activeTabId` inside a `setTabs` callback from the closure. Fix with a ref or reducer, same as #7.

### 18. Tab bar has no overflow indicator

The tab bar in Workspace.tsx uses `overflow-x-auto` but provides no visual signal that more tabs exist beyond the viewport (no scroll arrows, no fade gradient).

### 19. No keyboard shortcuts for tab management

No `Ctrl+W` to close active tab, no `Ctrl+Tab` to cycle tabs. For a "keyboard-friendly" dev tool (per PROJECT_CONTEXT), these are expected.

---

## Summary

| Severity | Count | Key themes |
|----------|-------|------------|
| BLOCKING | 3 | SQL injection, missing explicit security, no navigation restriction |
| MAJOR | 6 | DRY violations, performance (client-per-query), stale closures, state bugs |
| MINOR | 11 | Dead code, config issues, UX polish, consistency |

**Biggest quick wins:**
1. Add `READ ONLY` transaction to `getRows` (fixes #1, minimal change)
2. Explicit `webPreferences` (fixes #2, 3-line change)
3. Add `will-navigate` / `setWindowOpenHandler` (fixes #3, ~10 lines)
4. Extract `buildPgConfig` to shared module (fixes #4)
5. Swap `schemaCache` dep for a ref (fixes #6, biggest perf win)