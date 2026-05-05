# Table Types Tab

> **Status:** Complete

Add a `Types` tab to the table viewer so users can inspect the PostgreSQL types referenced by the current table without leaving the table context.

This should stay simple and aligned with PG Compass' inspection-first direction. The goal is not to become a PostgreSQL type designer. Users should be able to quickly understand which non-trivial types the table depends on, what kind of types they are, and any important value constraints such as enum options.

## Scope

The table viewer tabs should include:

- Data
- Structure
- Indexes
- Constraints
- Triggers [work in progress]
- Types
- Query

The `Types` tab should focus on the types used by columns in the currently selected table.

Recommended type coverage:

- Enums
- Domains
- Composite types

Built-in scalar types such as `text`, `integer`, `boolean`, and `timestamp` do not need dedicated rows in this tab. Those are already visible in the `Structure` tab and would add noise here.

## What To Show

Use a compact table where each row represents one distinct type used by the current table.

Recommended columns:

- Type name
- Schema
- Kind (`ENUM`, `DOMAIN`, `COMPOSITE`)
- Used by columns
- Summary

The `Summary` column should stay short and type-specific:

- Enum: number of values, with a small preview of values
- Domain: base type and whether it has a default or check constraint
- Composite: number of attributes

Selecting or expanding a row should show the relevant details for that type.

## Type Details

### Enums

Enums are the primary use case for this tab.

Show:

- All allowed values in defined order
- Number of values
- Columns in the current table that use the enum

The possible values should be easy to scan. A simple inline list or stacked badge/list treatment is enough. Do not add heavy visualization.

### Domains

Show:

- Underlying base type
- Default value if present
- Check constraint definition if present
- Columns in the current table that use the domain

This is useful because domains often carry the real constraint semantics a user needs to notice while inspecting a table.

### Composite Types

Show:

- Attribute names
- Attribute data types
- Columns in the current table that use the composite type

Keep this read-only and compact. A small nested table or definition list is enough.

## Behavior

When the tab opens, load the distinct user-defined types referenced by the selected table's columns. The query should be scoped to the current connection, schema, and table, and should avoid loading unrelated database-wide type metadata.

If the table does not use any supported user-defined types, show an empty state instead of a generic blank table.

The tab should support manual refresh through the existing viewer refresh behavior.

## UX Guidelines

- Keep the layout consistent with the `Indexes`, `Constraints`, and `Triggers` style tabs.
- Use shadcn `Table` components for the main listing.
- Keep density compact and data-first.
- Do not add create, edit, delete, or alter type actions.
- Do not show large explanatory text inside the tab.
- Use badges only where they improve scanning, such as for type kind.
- Preserve keyboard accessibility for row expansion and refresh behavior.

## Out of Scope

- Creating or editing types
- Dropping types
- Showing every type in the database
- Showing built-in scalar types in a dedicated listing
- Managing extension-defined types beyond displaying them when they appear as supported type kinds
- Type usage across other tables
- Deep dependency graphs between types

## Implementation Notes

- Add backend IPC for resolving supported user-defined types for a single table.
- Prefer deriving the type list from the table's actual column metadata, then joining only the catalog data needed for the supported kinds.
- Keep identifier handling safe through the existing SQL identifier utilities or a small shared helper if one already exists.
- Frontend state should stay local to the `Types` tab unless the existing metadata cache already has a clear place for it.
- Add focused tests around catalog parsing for enums, domains, and composite types where the current test structure supports it.

## Open Questions

- Should array columns of enum or composite types surface the underlying element type in this tab as well? Recommended: yes, but present them once as the underlying type and indicate array usage in the `Used by columns` list.
- Should range types be included in v1? Recommended: no, unless the current schema introspection layer already exposes them cheaply. They are less common for the app's initial inspection workflow and would add complexity.

## Implementation Progress

- [x] Added table metadata IPC for resolving supported user-defined types scoped to a single table.
- [x] Implemented the table viewer `Types` tab with compact rows and inline expandable details.
- [x] Included enum values, domain base/default/check metadata, and composite attributes.
- [x] Resolved array columns to the underlying user-defined type and marked array usage in the column list.
- [x] Added integration coverage for enum, enum array, domain, and composite type metadata.
