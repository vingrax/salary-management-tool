# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                        Browser                          │
│                                                         │
│   Next.js 14 (SPA)  ──  React Query  ──  shadcn/ui     │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTPS (REST JSON)
                           │ NEXT_PUBLIC_API_URL
┌──────────────────────────▼──────────────────────────────┐
│                    Express API                          │
│                                                         │
│   Routes  ──  Zod validation  ──  Services  ──  pg      │
└──────────────────────────┬──────────────────────────────┘
                           │ TCP (DATABASE_URL)
┌──────────────────────────▼──────────────────────────────┐
│                     PostgreSQL                          │
│                  employees table                        │
└─────────────────────────────────────────────────────────┘
```

Both the frontend and backend are deployed as separate Railway services within the same project. The Postgres instance is managed by Railway.

---

## Repository Structure

```
salary-management-tool/          ← monorepo root
├── railway.toml                 ← defines backend + frontend services
├── backend/
│   ├── src/
│   │   ├── app.ts               ← Express app factory (testable, no side effects)
│   │   ├── index.ts             ← entry point: runs migrations, starts server
│   │   ├── types.ts             ← shared TypeScript interfaces
│   │   ├── db/
│   │   │   ├── client.ts        ← pg Pool singleton
│   │   │   └── migrate.ts       ← CREATE TABLE IF NOT EXISTS on startup
│   │   ├── middleware/
│   │   │   └── validate.ts      ← Zod middleware factory
│   │   ├── routes/
│   │   │   ├── employees.ts     ← CRUD routes
│   │   │   └── insights.ts      ← aggregation routes
│   │   ├── services/
│   │   │   ├── employeeService.ts
│   │   │   └── insightService.ts
│   │   └── seed/
│   │       ├── seed.ts
│   │       ├── first_names.txt
│   │       └── last_names.txt
│   └── tests/
│       ├── helpers.ts           ← shared DB setup/teardown
│       ├── unit/                ← no DB required
│       └── integration/         ← real DB (salary_test)
└── frontend/
    ├── app/
    │   ├── layout.tsx           ← root layout with TabNav + QueryProvider
    │   ├── page.tsx             ← redirects to /employees
    │   ├── employees/page.tsx
    │   └── insights/page.tsx
    ├── components/
    │   ├── layout/              ← TabNav, QueryProvider
    │   ├── employees/           ← Table, Filters, Drawer, DeleteDialog
    │   └── insights/            ← KpiCards, SalaryBarChart, TenureBarChart,
    │                               InsightsTable, CurrencySelector
    ├── hooks/                   ← React Query hooks (useEmployees, useInsights)
    └── lib/                     ← api.ts, formatters.ts, currencies.ts
```

---

## Data Model

```sql
CREATE TABLE employees (
  id          SERIAL PRIMARY KEY,
  full_name   VARCHAR(255) NOT NULL,
  job_title   VARCHAR(255) NOT NULL,
  department  VARCHAR(255) NOT NULL,
  country     VARCHAR(100) NOT NULL,
  salary      NUMERIC(12, 2) NOT NULL,
  email       VARCHAR(255) UNIQUE NOT NULL,
  hired_at    DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_employees_country           ON employees(country);
CREATE INDEX idx_employees_country_jobtitle  ON employees(country, job_title);
```

`NUMERIC(12,2)` is used for salary to avoid floating-point rounding errors. The `pg` driver returns `NUMERIC` as a string, so all service functions explicitly coerce to `Number()`.

---

## API Routes

```
GET    /api/health
GET    /api/employees                 ?page, limit, search, country, jobTitle
GET    /api/employees/:id
POST   /api/employees
PUT    /api/employees/:id
DELETE /api/employees/:id

GET    /api/insights/summary
GET    /api/insights/country-stats
GET    /api/insights/jobtitle-stats
GET    /api/insights/tenure-stats
```

---

## Frontend Data Flow

```
InsightsPage (state: currency, selectedCountry, selectedJobTitle)
    │
    ├── useOrgSummary()      → GET /api/insights/summary
    ├── useCountryStats()    → GET /api/insights/country-stats
    ├── useJobTitleStats()   → GET /api/insights/jobtitle-stats
    └── useTenureStats()     → GET /api/insights/tenure-stats
    │
    ├── KpiCards             ← summary + currency
    ├── SalaryBarChart       ← jobTitleStats + selectedCountry + currency
    ├── TenureBarChart       ← tenureStats + currency
    └── InsightsTable        ← jobTitleStats + selectedCountry + selectedJobTitle + currency
```

All server state is managed by React Query. No global store (Redux, Zustand, etc.) is used — all data is server-derived and cached by React Query with a 30-second stale time.

---

## Deployment Architecture (Railway)

```
Railway Project: affectionate-ambition
├── Service: backend      (source: ./backend,  start: node dist/index.js)
├── Service: frontend     (source: ./frontend, start: node .next/standalone/server.js)
└── Plugin:  Postgres     (managed, injects DATABASE_URL into backend)
```

Environment variables:

| Service  | Variable              | Source                          |
|----------|-----------------------|---------------------------------|
| backend  | `DATABASE_URL`        | Railway Postgres plugin         |
| backend  | `NODE_ENV`            | Set manually: `production`      |
| backend  | `PORT`                | Set manually: `3001`            |
| frontend | `NEXT_PUBLIC_API_URL` | Set manually: backend public URL|
