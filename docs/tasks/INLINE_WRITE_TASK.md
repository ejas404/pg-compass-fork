# Edit Functionality: Phase 1 - Inline Writes

## Requirement

It's time we implement write functionality. Like the goal of this project, writes are meant to be simple and not so in your face.

Double clicking on the column entry should open a text box where we can edit the data inline and set it as whatever. But the type must be validated before sending it to the db. Ensure types like JSONB have proper edit functionality. Types like PostGIS should open a modal with map-specific editing functionality. Plan this out first and document it properly before implementation.

This should work in both card view and table view. 

> [!IMPORTANT]
> Edit functionality should be completely absent completely if we have it in read only mode in the settings. No sign of it should be there. Ensure tests enforce this. 

## Tests

We've got to ensure we have enough test harness prior to implementation. All edge cases must be carefully thought about and covered (use subagents). Both unit tests and end to end tests are required. Ensure pglite and real db are used, see testing setup in the project.
