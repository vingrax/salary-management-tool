# Trade-off Explanations

## Backend

### `OFFSET`-based pagination vs. cursor-based

**Chosen:** `LIMIT` / `OFFSET`  
**Alternative:** Keyset/cursor pagination

`OFFSET` is simple to implement, easy to expose as query params (`?page=2&limit=20`), and works well for datasets under ~100K rows. The trade-off is that deep pages become slower as Postgres must scan and discard all preceding rows. At 10K employees this is imperceptible (<1ms), so cursor pagination would be overengineering with no real-world benefit here.

---

### Single `employees` table vs. normalised schema

**Chosen:** Single flat table  
**Alternative:** Separate tables for departments, countries, job titles

Normalisation would enforce referential integrity and reduce storage, but at 10K rows neither matters. Every insight query is a group-by aggregation over `employees` — joins would add query complexity with no performance benefit. If the dataset grew to millions of rows or departments needed their own metadata (budget, manager), normalisation would be the right call.

---

### `NUMERIC(12,2)` for salary vs. `INTEGER` (cents)

**Chosen:** `NUMERIC(12,2)` (dollars with 2 decimal places)  
**Alternative:** `INTEGER` storing cents

`NUMERIC` avoids floating-point rounding errors without requiring the application to divide by 100 everywhere. The trade-off is that `pg` returns `NUMERIC` as a string, requiring explicit `Number()` coercion in every service function. This is a minor annoyance but safer than integer cents, which would require careful conversion at every display boundary.

---

### Migrations on startup vs. a migration runner

**Chosen:** `CREATE TABLE IF NOT EXISTS` in `migrate.ts`, called on every server boot  
**Alternative:** Dedicated migration tool (Flyway, node-pg-migrate, Drizzle)

Running idempotent DDL on startup is simple and safe for a single-table schema that won't change often. The trade-off is that this approach doesn't support rollbacks, doesn't track migration history, and would become unwieldy with many schema changes. For a production app with evolving schema, a proper migration runner would be the correct choice.

---

## Frontend

### React Query vs. server components

**Chosen:** Client-side data fetching via React Query  
**Alternative:** Next.js Server Components with `fetch`

Server Components would reduce client-side JavaScript and enable streaming, but they couple the frontend to the backend's network environment. Using React Query keeps the frontend as a pure SPA that communicates with the Express API over HTTP — the two services are fully independent and the frontend can be swapped or redeployed without touching the backend.

---

### Static currency rates vs. live FX API

**Chosen:** Hardcoded rates in `currencies.ts`  
**Alternative:** Live rates from an FX API (e.g. Open Exchange Rates)

Static rates are always available, add zero latency, and require no API key management. The trade-off is that rates become stale over time. For an HR tool used to compare salaries across countries (not execute transactions), ballpark rates are sufficient. If precise FX conversion were required, a daily-cached rate from a live API would be appropriate.

---

### Client-side currency conversion vs. server-side

**Chosen:** Convert on the frontend using static rates  
**Alternative:** Pass `?currency=INR` to the API and convert in SQL

Client-side conversion means the API always returns USD and the browser does the math. This keeps the API simple, makes all values cacheable regardless of currency, and avoids recomputing queries when users switch currencies. The trade-off is that large salary values in high-rate currencies (INR, etc.) produce large numbers in JavaScript — not a practical problem at this scale.

---

## Infrastructure

### Two Railway services vs. monolith

**Chosen:** Separate `backend` and `frontend` Railway services  
**Alternative:** Single service serving both API and static files

Separate services allow independent scaling, deployment, and resource allocation. The front end can be redeployed without touching the API (and vice versa). The trade-off is slightly more deployment complexity and the need to manage CORS and the `NEXT_PUBLIC_API_URL` environment variable. For a team environment this separation is clearly worth it.

---

### No Redis / caching layer

**Chosen:** No cache  
**Alternative:** Redis cache for insight aggregations

Insight queries (country stats, job title stats, tenure stats) run aggregations over 10K rows. On a modern Postgres instance with the composite index on `(country, job_title)`, these complete in under 5ms. Adding Redis would introduce operational complexity (another service, cache invalidation logic) with no measurable user benefit at this data size.
