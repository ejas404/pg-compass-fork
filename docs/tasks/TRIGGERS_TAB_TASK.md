# Table Triggers Tab

> **Status:** Implemented

Add a `Triggers` tab to the table viewer so users can inspect the triggers defined on a table and quickly enable or disable them.

This should stay simple and aligned with PG Compass' inspection-first direction. The goal is not to become a trigger authoring tool. Users should be able to see what triggers exist, understand the most useful metadata at a glance, and toggle a trigger on or off when needed.

## Scope

The table viewer tabs should include:

- Data
- Structure
- Indexes
- Constraints
- Triggers
- Query

The `Triggers` tab should show a compact table of triggers for the currently selected table.

Recommended columns:

- Trigger name
- Enabled state
- Timing (`BEFORE`, `AFTER`, `INSTEAD OF`)
- Events (`INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`)
- Function name
- Definition

The enabled state should be controlled with a switch in each row.

## Behavior

When the tab opens, load the table's triggers from PostgreSQL catalog metadata. The query should be scoped to the current connection, schema, and table, and should avoid expensive database work.

Toggling a trigger should run the appropriate PostgreSQL command:

- Enable: `ALTER TABLE <schema>.<table> ENABLE TRIGGER <trigger>`
- Disable: `ALTER TABLE <schema>.<table> DISABLE TRIGGER <trigger>`

After a toggle completes, refresh the trigger row state. Show clear inline or toast feedback for success and failure.

## UX Guidelines

- Keep the layout consistent with the `Indexes` and `Constraints` tabs.
- Use shadcn `Table` components for the trigger listing.
- Use a shadcn-style switch for the enabled state.
- Keep row actions minimal. Do not add edit, create, duplicate, or delete trigger actions.
- Do not show large explanatory text inside the tab.
- Use an empty state when the table has no triggers.
- Preserve keyboard accessibility for the switch and any refresh action.

## Safety

Disabling triggers can affect database behavior. The UI should make the state explicit, but avoid adding a heavy confirmation flow unless existing app patterns already require one for similar table-level changes.

Only table-scoped triggers for the selected table should be shown and toggled. System/internal triggers should not be exposed for toggling unless they are already handled elsewhere in the app's database metadata model.

Identifier handling must be safe. Schema, table, and trigger names should be quoted through the existing SQL identifier utilities or a small shared helper if one already exists.

## Out of Scope

- Creating triggers
- Editing trigger definitions
- Deleting triggers
- Managing trigger functions
- Database-wide trigger views
- Event triggers
- Bulk enable/disable controls

## Implementation Notes

- Backend IPC lists table triggers from PostgreSQL catalog metadata and toggles enabled state with `ALTER TABLE ... ENABLE/DISABLE TRIGGER`.
- The renderer adds a simple `Triggers` tab to table details only, using the existing table context and local tab state.
- System/internal triggers are excluded from the listing and cannot be toggled through this path.
- The toggle path respects read-only mode and quotes schema, table, and trigger identifiers before building SQL.
- Integration coverage verifies trigger metadata loading and enable/disable behavior.
