# Performance Considerations

## Database

### Indexes

Two indexes are created at migration time:

```sql
CREATE INDEX idx_employees_country          ON employees(country);
CREATE INDEX idx_employees_country_jobtitle ON employees(country, job_title);
```

The single-column index covers the country filter on the employee list endpoint. The composite index covers the insight aggregations that group by `(country, job_title)`, which is the most expensive read pattern in the app. Without it, every insight query would be a full sequential scan.

### `NUMERIC` coercion cost

The `pg` driver returns `NUMERIC` columns as strings. Every row returned by the service layer calls `Number(r.salary)`. At 20 rows per page this is negligible; across 10K rows in an aggregation query, it's still immeasurably small.

### Pagination

All list queries use `LIMIT` / `OFFSET`. At 10K rows and 20 rows per page, the worst case is page 500, which requires Postgres to skip 9,980 rows. On a table this small with a sequential scan, this is under 1ms. If the dataset grew to millions of rows, switching to keyset pagination (using `WHERE id > last_seen_id`) would be necessary.

---

## Seed Script

### Batched inserts

The seed inserts 10,000 rows in 10 batches of 1,000 rows each, using a single `INSERT INTO ... VALUES (...)` statement per batch with positional parameters. This avoids 10,000 round trips to the database.

Alternative approaches considered:
- **`COPY`** — fastest possible method, but requires file access or a stream and is harder to parameterise
- **Single large INSERT** — PostgreSQL has no hard limit on VALUES clauses but large statements consume more memory and are harder to debug
- **One INSERT per row** — ~100× slower due to round-trip overhead

Observed runtime: ~3 seconds locally against Docker Postgres, ~8 seconds against Railway's managed Postgres over the public proxy.

### Single transaction

All batches are wrapped in a single `BEGIN` / `COMMIT`. This means either all 10K rows are inserted or none are, and Postgres only writes the WAL once at commit rather than after each batch.

---

## API

### Parallel queries in `listEmployees`

The employee list endpoint runs the data query and the count query in parallel:

```typescript
const [dataResult, countResult] = await Promise.all([
  pool.query(`SELECT * FROM employees ${where} ... LIMIT $N OFFSET $M`, values),
  pool.query(`SELECT COUNT(*) FROM employees ${where}`, values),
]);
```

Running them sequentially would double the latency of every paginated request. Both queries hit the same indexes and have similar execution plans, so parallelising them halves the DB round-trip time.

### Connection pooling

The `pg.Pool` singleton is created once at module load time and reused across all requests. Default pool size is 10 connections. On Railway's Postgres (which has a connection limit depending on plan), this is well within bounds for a single backend instance.

---

## Frontend

### React Query stale time

All queries use a 30-second stale time:

```typescript
new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } })
```

This means navigating between tabs or re-focusing the window won't trigger unnecessary refetches. Insight data (salary stats) changes only when employees are mutated, so 30 seconds is a reasonable balance between freshness and network usage.

### Employee mutations invalidate cache

All create/update/delete mutations call `queryClient.invalidateQueries({ queryKey: ['employees'] })` on success. This ensures the table reflects the latest state immediately after a mutation without requiring a manual refresh.

### Currency conversion is zero-cost

Currency conversion happens entirely in the browser with a multiplication against a static rate constant. There is no additional network request, no debounce needed, and no re-fetch triggered when the user switches currency — the existing cached data is simply re-rendered with the new rate applied.

---

## Bundle Size

Next.js build output for reference:

| Route | Size | First Load JS |
|---|---|---|
| `/employees` | 31.4 kB | 186 kB |
| `/insights` | 109 kB | 263 kB |

The insights page is larger due to Recharts (~100 kB gzipped). This is acceptable for a data-heavy dashboard. If bundle size became a concern, Recharts could be lazy-loaded or replaced with a lighter charting library.
