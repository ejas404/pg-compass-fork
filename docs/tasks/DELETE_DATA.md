# Delete Data

Status: Completed

In our `data-tab.tsx`, we have a "Delete" button that allows users to delete data from the database. Currently, this button is not implemented and disabled.

## Requirement

When a user clicks the "Delete" button, we will show a modal containing the following:

0. Heading that says "Delete X documents"
1. A filter input (read-only) that shows the current filter applied to the data. This will help users understand what data they are about to delete.
2. A preview (sample of upto 5 documents, handle case where fewer or no docs) in both table view or JSON view (similar to the "View" button in the data tab) that shows the data that will be deleted. This will give users a clear idea of what data they are about to delete.

A cancel button and delete button

> Ensure idiomatic shadcn implementation for the dialog, refer other dialogs in the codebase

A small alert box should show with a yelllow warning:
that unintended files maybe deleted if new docs are added or existing ones are deleted while the modal is open. This is to ensure that users are aware of the potential risks of deleting data and to encourage them to review the query they are about to run for deletion before confirming the deletion.

---

The current query will be used for deletion

Ensure test cases fully cover all potential edge cases with this

## Implementation Notes

- The Data tab delete action now opens a confirmation dialog with the active filter, a warning, and a sample preview of up to five matching documents.
- The preview can be switched between table and JSON modes, and empty/error preview states are handled before allowing deletion.
- Deletion runs through the main-process table data IPC API, respects read-only mode, returns the actual deleted count, and refreshes the Data tab afterward.
- Unit and integration coverage was added for the dialog, preload API contract, and main-process delete behavior.
