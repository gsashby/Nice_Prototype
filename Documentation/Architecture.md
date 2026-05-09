# Architecture Overview

## System diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│  Browser                                                             │
│                                                                      │
│  Next.js 15 App (apps/web — localhost:3000)                          │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  React 19 · Tailwind CSS v4 · TanStack Query · Zustand       │   │
│  │                                                              │   │
│  │  (dashboard) pages                                           │   │
│  │    Governance · Audit Log · Policy Engine · NLQ · etc.       │   │
│  │                                                              │   │
│  │  Next.js route handlers  (server-side — key never leaves)    │   │
│  │    POST /api/summarize          ───────────────────────────────────► Anthropic
│  │    POST /api/explain-event      ───────────────────────────────────► Claude API
│  │    POST /api/report-summaries   ───────────────────────────────────► Claude API
│  │    POST /api/report-addition    ───────────────────────────────────► Claude API
│  └──────────────────────────────────────────────────────────────┘   │
│           │  fetch (NEXT_PUBLIC_API_URL)                             │
└───────────┼─────────────────────────────────────────────────────────┘
            │
            ▼
┌───────────────────────────────────────────┐
│  Go REST API (apps/api — localhost:8080)   │
│                                            │
│  Fiber v2 HTTP framework                   │
│  pgx v5 connection pool (min 2, max 20)    │
│                                            │
│  Handlers                                  │
│    GovernanceHandler                       │
│    AuditLogHandler                         │
│    PolicyHandler                           │
└───────────────────────┬───────────────────┘
                        │
            ┌───────────┼────────────┐
            ▼           ▼            ▼
    ┌──────────────┐  ┌──────────┐  ┌───────────────┐
    │  PostgreSQL   │  │  Redis   │  │  ClickHouse   │
    │  (TimescaleDB)│  │  :6379   │  │  :8123/:9000  │
    │  :5432        │  │          │  │               │
    │               │  │  Cache / │  │  Analytics    │
    │  audit_events │  │  pub-sub │  │  layer        │
    │  ai_models    │  │  (ready) │  │  (future)     │
    │  policies     │  └──────────┘  └───────────────┘
    │  tenants      │
    └──────────────┘
```

---

## Request flow — standard data fetch

```
1. React component mounts
2. TanStack Query hook fires (e.g. useAuditLog)
3. apiGet() calls fetch(NEXT_PUBLIC_API_URL + "/api/v1/audit-log?...")
4. Go API handler receives request
5. Repository layer builds parameterised SQL query
6. pgx executes against PostgreSQL / TimescaleDB
7. JSON response flows back to TanStack Query cache
8. Component renders with data
```

TanStack Query caches results by query key (filter values). On the Governance Dashboard, three hooks poll every 30 seconds independently. On the Audit Log Explorer, the cache is invalidated on filter change (page resets to 1).

---

## Request flow — AI features

```
1. User clicks "Summarize with AI" or "Explain with AI"
2. Browser POSTs to Next.js route handler (/api/summarize or /api/explain-event)
   — this is a server-side function, never executed in the browser
3. Route handler calls Anthropic SDK with ANTHROPIC_API_KEY (env var, server only)
4. Claude Sonnet 4.6 generates a response (600 or 500 max_tokens)
5. Route handler returns { summary } or { explanation } JSON to browser
6. Modal or drawer renders the plain-text response
```

The API key is in `apps/web/.env.local` which is gitignored. It is never bundled into client JavaScript.

---

## Monorepo structure

Managed by **Turborepo 2.x**. The `turbo.json` pipeline defines task dependencies (build depends on type-check, etc.). Running `npm run dev` from the root starts all apps in parallel.

```
ai-trust-center/
├── apps/
│   ├── web/          Next.js 15 frontend
│   └── api/          Go 1.22+ REST API
├── packages/
│   ├── ui/           Shared React component stubs (unused in current build)
│   ├── types/        Shared TypeScript type definitions
│   ├── eslint-config/
│   └── typescript-config/
├── infra/
│   └── docker/
│       ├── docker-compose.yml
│       └── init/
│           ├── 01_extensions.sql   Schema + TimescaleDB setup (runs on first up)
│           └── 02_seed.sql         Spot seed data — 40 recent events (runs on first up)
├── turbo.json
└── package.json      Root workspace — npm workspaces
```

---

## Key technology decisions

| Decision | Choice | Why |
|---|---|---|
| Frontend framework | Next.js 15 App Router | Server components + route handlers keep API key server-side; no separate BFF needed |
| Styling | Tailwind CSS v4 | Utility-first, no runtime CSS-in-JS cost; v4 uses native CSS cascade layers |
| Server state | TanStack Query v5 | Handles caching, background refetch, loading/error states with minimal boilerplate |
| Client state | Zustand | Lightweight; used only for UI state (sidebar, alert acknowledgements) |
| Charts | Recharts | React-native, composable, sufficient for the current line chart use case |
| API language | Go + Fiber v2 | High throughput for audit log queries; pgx is the fastest PostgreSQL driver for Go |
| Database | PostgreSQL 16 + TimescaleDB | TimescaleDB hypertables give time-series partitioning on `audit_events.event_time` for fast range queries |
| AI | Anthropic Claude Sonnet 4.6 | Strong analytical writing for compliance summaries; server-side SDK call keeps credentials secure |

---

## Ports at a glance

| Service | Port | Started by |
|---|---|---|
| Next.js frontend | 3000 | `npm run dev` (root) or `cd apps/web && npm run dev` |
| Go API | 8080 | `cd apps/api && make run` |
| PostgreSQL | 5432 | `npm run db:up` (Docker) |
| Redis | 6379 | `npm run db:up` (Docker) |
| ClickHouse HTTP | 8123 | `npm run db:up` (Docker) |
| ClickHouse native | 9000 | `npm run db:up` (Docker) |

---

## What is and isn't wired up

| Feature | Status |
|---|---|
| Audit log read (paginated, filtered) | Wired — Go API → PostgreSQL |
| Governance metrics | Wired — Go API → PostgreSQL |
| Model health | Wired — Go API → PostgreSQL |
| Alerts | Wired — derived from audit_events in Go API |
| Policy CRUD + toggle | Wired — Go API → PostgreSQL |
| AI summarise / explain | Wired — Next.js route handler → Anthropic |
| Audit log export (CSV/JSON/SIEM) | Wired — client-side, fetches from Go API |
| Redis | Running but not used — reserved for WebSocket pub-sub |
| ClickHouse | Running but not used — reserved for analytics-scale queries |
| WebSocket live updates | Scaffolded (`useWebSocket.ts`) but not connected |
| Board Report Builder | Wired — 2-step wizard, live data aggregation, Claude AI summaries, SHA-256 audit certificate |
| Model Registry | Wired — searchable model catalogue, governance scores, detail drawer, register form |
| Data Flow Visualizer | Wired — animated SVG pipeline diagram, node detail, live KPIs, recent events feed |
| Agent Monitor | Placeholder page — not built |
| Authentication / RBAC | Not implemented — all requests use the seed tenant ID |
