# Planning and Design Notes

## Project Goal

Build a full-stack HR salary management tool that supports:
- CRUD operations on 10,000 employees
- Salary insights: org-wide summary, breakdowns by country, job title, and tenure
- A client-side currency converter for display purposes
- Deployment to Railway as two independently deployable services

---

## Scope Decisions

### Auth deferred to Phase 2

Authentication and role-based access control were explicitly out of scope for Phase 1. The app is accessible without login. This was a deliberate trade-off to keep the assessment scope manageable and focus on data layer, API design, and frontend UX.

### Single-table data model

All employee data lives in one `employees` table with no joins. This was chosen because:
- The dataset is fixed at ~10K rows — no relational complexity needed
- All insight queries are aggregations over a single entity
- Joins would add latency without adding value at this scale

### No Next.js server components

The frontend is a pure client-side SPA using React Query for all data fetching. Server components were intentionally avoided to maintain a clean separation between the Express API and the Next.js frontend — both are independently deployable and the frontend has no knowledge of the database.

---

## Feature Iterations

### Phase 1 (implemented)
- Employee CRUD with pagination, search, country/job title filters
- Salary insights: org summary KPIs, avg salary by job title (bar chart), breakdown table
- Currency converter (client-side, static rates): USD, EUR, GBP, INR, AED, CAD, AUD, SGD
- Tenure insights: avg salary grouped by 0–1yr, 1–3yr, 3–5yr, 5yr+
- 10K employee seed using batched inserts

### Phase 2 (not implemented)
- HR Manager login (JWT or OAuth)
- Protected routes and role-based access control
- Audit log for employee data changes

---

## Key Design Choices

### Seed strategy
Rather than loading from CSV, the seed script generates employees in-process from two name lists (`first_names.txt`, `last_names.txt`) with randomised job titles, salary ranges, countries, and hire dates. This produces realistic variance while being fully reproducible and idempotent (TRUNCATE + RESTART IDENTITY on each run).

### Pagination approach
Server-side pagination using `LIMIT` / `OFFSET` on all list queries. Cursor-based pagination was considered but deemed unnecessary for a 10K dataset where page jumps are uncommon.

### Currency conversion
Rates are stored as static constants at build time. No external API is called at runtime. This was chosen because:
- The spec required no external API dependency
- HR tools display salaries for rough comparison, not precise FX transactions
- Static rates are always available, even offline
