# Testing

PG Compass uses a desktop-focused test pyramid for `apps/desktop`.

## Suites

- `pnpm test:unit`
  Runs fast Vitest coverage for renderer helpers, hooks, preload contracts, and store logic.
- `pnpm test:integration`
  Runs the fast Vitest integration suite against PGlite through its PostgreSQL socket server.
- `pnpm test:integration:postgres`
  Runs the authoritative Vitest integration suite against a real PostgreSQL server provided via env vars.
- `pnpm test:e2e`
  Packages the Electron app and runs Playwright against the real desktop shell.
- `pnpm test`
  Runs unit and integration suites together.
- `pnpm test:coverage`
  Runs Vitest with coverage reporting.
- `pnpm test:watch`
  Runs Vitest in watch mode.

All commands are intended to be run from the repository root.

## Database Fixtures

Database-backed tests use a seeded PostgreSQL dataset with:
- `app.users`
- `app.orders`
- JSONB fields
- indexes
- constraints
- a view
- enough rows to exercise pagination

### Fast Integration: PGlite

`pnpm test:integration` uses:
- `@electric-sql/pglite`
- `@electric-sql/pglite-socket`
- the same seeded SQL fixture used by the real PostgreSQL suite

This is the default integration path because it is fast and requires no external database installation.

### Authoritative Integration: Real PostgreSQL

`pnpm test:integration:postgres` requires one of the following:

Recommended:

```bash
PG_COMPASS_TEST_ADMIN_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
```

Fallback:

```bash
PG_COMPASS_TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pg_compass_test
```

Behavior:
- `PG_COMPASS_TEST_ADMIN_DATABASE_URL` creates and drops a disposable database per run.
- `PG_COMPASS_TEST_DATABASE_URL` reuses a fixed database and reseeds the `app` schema each run.

Recommendation:
- use `pnpm test:integration` during local TDD loops
- use `pnpm test:integration:postgres` for authoritative verification and CI

## Coverage Policy

Coverage is risk-based, not a single global percentage:
- `apps/desktop/src/main/**` must keep strong unit or integration coverage.
- `apps/desktop/src/preload.ts` must have contract coverage.
- renderer state hooks must have direct tests.
- critical user journeys must have named Playwright coverage.

Use [TEST_COVERAGE_MATRIX.md](./TEST_COVERAGE_MATRIX.md) as the source of truth for current feature coverage.

## TDD Rule

Every new desktop feature should start with a short feature test plan:
- the first failing unit or integration test
- the Electron or renderer seam that must be validated
- whether a Playwright scenario is required

Default sequence:
1. write the failing unit or integration test
2. implement the minimum code to pass
3. add or extend one higher-level test when the change affects user-visible flow or IPC wiring

Bug fixes must add a regression test.
