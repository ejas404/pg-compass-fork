# Performance Considerations

Because PG compass is a database viewer, we cannot always ensure that the database or arbitrary queries will be performant. Traditional methods like indexes are not predictable. However, we can ensure that the app itself is performant and does not cause additional performance issues.

Queries for statistics and metadata should be optimized and should not cause additional load on the database. The app should also provide feedback to the user when queries are taking too long and allow them to cancel the query if needed.

## Pagination Required

Never load entire tables.

Use:

```sql
LIMIT
OFFSET
```

---

## Large Tables

Row counts should use:

```sql
SELECT reltuples
FROM pg_class
```

instead of full `COUNT(*)`.

## Query Timeouts

Prevent runaway queries.

Add configurable timeout.
