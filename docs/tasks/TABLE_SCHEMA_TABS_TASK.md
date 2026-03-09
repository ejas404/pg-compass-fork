# Table & Schema Views

We need to ensure maintainable and a clear way to design our "tabbed" interface before proceeding with this task. This is because the table viewer and schema viewer both rely heavily on the tabbed interface and we want to make sure we have a solid foundation before building on top of it.

Every view must have a breadcrumb at the top that shows the current location in the database hierarchy. For example, if a user is viewing a table, the breadcrumb should show something like: `[Database Name] > [Schema Name] > [Table Name]`. This helps users understand where they are in the database structure and allows for easy navigation back to previous levels.

This top part also has a "Refresh" button that allows users to refresh the data in the current view. This is important because database contents can change and users need a way to see the latest data without having to navigate away and back again.

We might later need to implement context-specific actions in the breadcrumb area as well, such as "Add New Table" when viewing a schema or "Edit Table" when viewing a table, but for now we will just focus on the refresh functionality and the breadcrumb navigation. But do consider this when designing the layout of the breadcrumb area to ensure this is a possibility design-wise and architecturally.

## Schema List Viewer

The schema list viewer is a content view that shows the schemas inside a database. It is opened when a user clicks on a database in the sidebar. The schema viewer has a tabbed interface with two tabs: "Tables" and "Views". The "Tables" tab shows a list of tables in the selected schema, while the "Views" tab shows a list of views in the selected schema. Each row in the tables and views listing should show the name, number of rows, and size on disk. Clicking on a table or view should open the respective table or view viewer in a new tab in the main area.

## Table List Viewer

The table list viewer is a content view that shows the list of tables in a schema. It is opened when a user clicks on a table in the sidebar (which also expands the accordion and opens this viewer) or from the tables listing in the schema viewer.

> [!IMPORTANT]
> The table data viewer (and the view data viewer) with the actual data of the table, structure, indexes, etc. is a separate viewer and is not the scope of this task. We will implement that at a later stage.

## View List Viewer

The view list viewer is similar to the table list viewer but shows the definition of the view instead of the data.

---

Design this in a maintainable way so that we can easily add more viewers in the future (e.g. table data viewer, functions viewer, etc.) without having to duplicate code or create a mess. Consider creating reusable components for the tabbed interface and the breadcrumb navigation to ensure consistency across different viewers and to make it easier to maintain and extend in the future.

Keep the code clean and well-structured!

---

## Implementation Progress

- [x] Added a reusable workspace tab system that can host multiple viewer types.
- [x] Implemented database-level schema listing view (opened when clicking the database entry).
- [x] Added a reusable viewer shell with breadcrumb navigation area and refresh action.
- [x] Implemented schema viewer with `Tables` and `Views` tabs.
- [x] Implemented table list viewer for schema-scoped table listings.
- [x] Implemented view list viewer with view definition column.
- [x] Wired sidebar interactions:
  - Clicking a database opens a schema listing view tab and expands the schema tree.
  - Clicking a schema opens a schema viewer tab.
  - Clicking a table opens a table list viewer tab.
- [x] Built the structure so new viewer types can be added without changing sidebar/workspace fundamentals.

## Notes

- Backend schema IPC now includes per-table estimated row counts and on-disk sizes for table listings.
- View definitions are still placeholder values (`Unknown` / fallback SQL) until dedicated view metadata endpoints are added.
