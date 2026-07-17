# Query Cancellation ADR

## Description

Ad-hoc queries need cancellation without disconnecting the saved connection or interrupting unrelated pool work.

## Decision

Each renderer query receives a unique `queryId`. The main process maps that ID to the checked-out PostgreSQL backend PID for the lifetime of the request. Cancellation crosses the typed preload/IPC boundary and runs `pg_cancel_backend` for only that PID from a short-lived dedicated client. Completed or repeated cancellations return an idempotent status.

Pending IDs are registered before pool acquisition. Once a backend PID is assigned, the target pool lease is held until any in-flight cancellation handshake settles, preventing that backend from being reused for unrelated work during the completion/cancellation race.

## Rationale

PostgreSQL backend cancellation is narrowly scoped, preserves the shared connection pool, and handles the race between completion and cancellation without exposing database or Node primitives to the renderer.

## Status

Accepted.

## Consequences

- Query IDs must be unique per in-flight renderer request.
- Cancellation opens a short-lived connection so a saturated pool cannot block it.
- PostgreSQL reports cancellation as SQLSTATE `57014`, which the main process normalizes to a user-facing cancellation result.
- The renderer retains the last successful result and remains ready for another query.
