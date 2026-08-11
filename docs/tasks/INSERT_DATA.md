# Insert Data

In our `data-tab.tsx`, we have a "Insert" button with two options: "Insert JSON or CSV file" and "Insert document". Both are disabled at the moment and not implemented.

## Requirement

When a user clicks on "Insert JSON or CSV file", we will show a native file picker that allows them to select a JSON or CSV file from their computer. We will then read the file, parse the contents, and send the query to the backend to insert the data into the database. We might need to send data to the backend in chunks if its too large and ensure its send as a single transaction in the backend to ensure atomicity.

See export data flow for reference on how to handle uploads, progress indication, and success/failure toasts. Proper error messages should be shown to the user in case of failure, and a success message should be shown once the data is successfully inserted.

When a user clicks on "Insert document", we will show a modal with the exact same editor as for the Edit row feature (refer docs/tasks/ROW_EDIT_TASK.md). Reuse the same component and all its features (JSON editing, validation, etc). The only difference is that the "Save" button will say "Insert" and the query sent to the backend will be for insertion instead of update.

> Rename the "Insert document" name to "Insert row"

## Tests

Use a subagent to brainstorm edge cases and test cases for this feature. Ensure that all edge cases are covered in the test cases.

Ensure large files are supported and properly handled with chunking under same transaction

## Implementation Notes

**Status:** Implemented and reviewed (2026-08-11)

### Backend (Main Process)

- **`insertRow`** ([src/main/table-data-write.ts](../../apps/desktop/src/main/table-data-write.ts)) builds a single `INSERT INTO … (cols) VALUES ($n::cast, …) RETURNING *`. Columns the user never touches are omitted so column defaults / serials apply; an empty change set emits `INSERT … DEFAULT VALUES`. Shares `updateRow`'s read-only gate, duplicate-column guard, and `SAFE_PG_CAST` / enum allow-listing. `setNull` emits a literal `NULL`.
- **`importData`** ([src/main/table-data-import.ts](../../apps/desktop/src/main/table-data-import.ts)) streams the picked file and inserts rows inside **one** `BEGIN … COMMIT`. Memory stays bounded to the current parsed row and SQL batch. Batches keep `rows × columns ≤ 65,535` (Postgres bind-param limit), capped at 1,000 rows; a failure in _any_ batch rolls back the whole import. Progress is correlated by operation ID so overlapping imports cannot update each other's toasts.
  - **CSV** parsing is strict RFC 4180 (quoted commas/newlines, `""` escaping, CRLF/LF), strips a UTF-8 BOM, distinguishes blank lines from quoted empty fields, rejects malformed quoting, duplicate/empty headers, and over-wide rows, and maps empty cells to `NULL`.
  - **JSON** accepts an array of objects (or a single object), discovers the union of keys in a streaming first pass, and streams rows in a second pass. Missing keys become `NULL`; lossless number handling prevents bigint/numeric rounding, including inside nested json/jsonb values.
- **Security**: the open-file dialog approves the chosen path (`ipc-security`, purpose `"import"`) and `importData` consumes that grant — the renderer can't hand the main process an arbitrary path. Identifiers (schema/table/file-supplied column names) go through `quoteIdent`; every value is a bound parameter. Read-only mode is enforced in the main process for both flows.

### Frontend (Renderer)

- **`AddDataDropdown`** ([src/components/workspace/table-viewer/add-data-dropdown.tsx](../../apps/desktop/src/components/workspace/table-viewer/add-data-dropdown.tsx)) replaces the disabled "Add Data" menu. "Import JSON or CSV file" opens the native picker (format inferred from extension) and shows a progress → success/failure toast mirroring the export flow. "Insert row" (renamed from "Insert document") opens the row editor in insert mode.
- **`RowEditDialog`** now takes a `mode` prop. In `insert` mode every column is editable (PK included), untouched fields are omitted, explicitly entered empty strings are preserved, the button reads **Insert**, and Save dispatches `insertRow`. A synchronous re-entry guard prevents duplicate keyboard submissions. `edit` mode is unchanged.
- Both entries are gated on `isTable && !readOnlyMode`; the grid refreshes on success.

### Tests

- **Unit**: parser coverage includes RFC 4180 boundaries and malformed quoting, BOM, quoted-empty rows, lossless JSON numbers, batch sizing, and identifier quoting. Row-editor coverage includes all-column editing, default omission, explicit empty strings, DEFAULT VALUES, and duplicate-submit prevention. Preload and IPC validation contracts are covered.
- **Integration** (PGlite + Postgres, [table-data.suite.ts](../../apps/desktop/tests/integration/table-data.suite.ts)): insert happy path / defaults / DEFAULT VALUES / duplicate-column / read-only / UNIQUE / hostile column name; import CSV & JSON happy paths, exact bigint round trips, **cross-batch rollback atomicity**, 2,500-row streamed commit, header-only, empty-file, read-only, and hostile-CSV-header injection.
- Unit tests, PGlite integration tests, lint, and typecheck are clean.
