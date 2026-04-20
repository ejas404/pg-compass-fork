# Test Coverage Matrix

This matrix tracks which currently implemented behaviors are covered by unit, integration, and Playwright tests.

| Capability | Unit / Component | Integration | Playwright |
| --- | --- | --- | --- |
| Connection store persistence and favourites | Yes | No | Indirect |
| Connection form parsing and validation | Yes | No | Indirect |
| Settings persistence and theme state | Yes | No | Yes |
| Workspace tab state and schema caching | Yes | No | Indirect |
| Preload API contract | Yes | No | Indirect |
| Query read-only guards and pagination helpers | Yes | Yes, via PGlite and PostgreSQL | Yes |
| Export SQL and CSV formatting helpers | Yes | No | Yes |
| Table row loading | No | Yes, via PGlite and PostgreSQL | Yes |
| Cell edit (text, json, postgis) | Yes | Yes, via PGlite (postgis gated on PostgreSQL) | Yes |
| Enum metadata and dropdown editing | Yes | Yes, via PGlite and PostgreSQL | Indirect |
| Read-only-mode gate (no edit affordance in DOM) | Yes | Yes | Yes |
| Structure, index, and constraint metadata | No | Yes, via PGlite and PostgreSQL | Partial |
| Connection-to-schema navigation flow | No | No | Yes |
| Query tab execution | No | Yes | Yes |
| Export flow | No | No | Yes |

## Current Gaps

Still targeted for expansion:
- direct IPC handler registration tests for `connection-ipc.ts`, `settings-ipc.ts`, and `table-data-ipc.ts`
- deeper Playwright coverage for create, edit, delete, and keyboard tab shortcuts
- renderer component tests for table pagination and query result mode switching
- export and stream-path authoritative coverage against real PostgreSQL and `pg-copy-streams`
