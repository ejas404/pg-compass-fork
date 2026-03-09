# Task: Schema View

> **Status:** Completed

"New Connection" in the sidebar can be used to create a new connection. This was implemented as part of `docs/tasks/CONNECTION_MANAGEMENT_TASK.md`, but we will need to expand on it in this task to show schemas and tables in the sidebar as well.

Once a connection is established, it can be expanded (it works like an accordion) to show the database schemas. The schemas can be expanded to show the tables which is as far as the sidebar goes. We need to use our existing pg client integration to fetch the actual schemas and tables from the connected database and display them in the sidebar. We can show a loading state while fetching the schemas and tables to simulate the fetching process.

## Implementation Notes

- Added a new IPC channel `connections:get-schema-tree` to fetch schema and table metadata for a selected connection.
- Implemented main-process query logic with the existing `pg` client using `pg_tables`, excluding system schemas (`pg_catalog`, `information_schema`, `pg_toast%`).
- Extended preload + renderer API (`window.connectionApi.getSchemaTree`) and shared TypeScript types to keep the contract type-safe.
- Replaced sidebar placeholder state with real nested rendering:
  - Connection row expands after successful connect.
  - Level 1 shows schemas.
  - Each schema can be expanded to show Level 2 tables.
  - Loading skeletons are shown while fetching.
  - Errors are surfaced via toasts.
