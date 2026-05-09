# AI Trust Center — NICE CXone Mpower

A governance and auditability platform for AI systems running inside NICE CXone Mpower. It provides real-time oversight of AI decision-making across Autopilot, Copilot, and Mpower Agent modules — covering audit logging, policy enforcement, compliance reporting, and model health monitoring.

---

## What it does

| Feature | Description |
|---|---|
| **Governance Dashboard** | KPI cards, AI decision volume chart, active alerts feed, module health table, and AI-generated executive summary |
| **Audit Log Explorer** | Filterable, paginated event log for every AI decision — sortable columns, per-row detail drawer with session timeline and AI causal analysis, CSV/JSON export, and SIEM push (CEF format) |
| **Policy Engine** | Create, toggle-enable/disable, and manage governance rules that trigger on AI events |
| **Board Report Builder** | Step-by-step wizard to generate executive compliance reports with cryptographic audit certificate |
| **Natural Language Query** | Ask plain-English questions against the audit data — results are drillable with full event detail |
| **Agent Trust Panel** | Per-agent confidence scores, override rates, and recommendation history |

---

## Architecture

```
ai-trust-center/
├── apps/
│   ├── web/              # Next.js 15 frontend (React 19, Tailwind CSS v4)
│   └── api/              # Go REST API (Fiber v2, pgx)
├── packages/
│   ├── ui/               # Shared React component stubs
│   ├── types/            # Shared TypeScript types
│   ├── eslint-config/    # ESLint config presets
│   └── typescript-config/ # Shared tsconfig presets
├── infra/
│   └── docker/           # Docker Compose + DB init scripts
├── turbo.json            # Turborepo pipeline
└── package.json          # Root workspace scripts
```

### Frontend (`apps/web`)

- **Framework**: Next.js 15 (App Router)
- **UI**: React 19 + Tailwind CSS v4
- **State**: Zustand (UI state), TanStack Query v5 (server state)
- **Charts**: Recharts
- **Icons**: Lucide React
- **AI**: Anthropic SDK (`@anthropic-ai/sdk`) — server-side Next.js route handlers keep the API key off the client

```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── layout.tsx          # Shell: Sidebar + TopHeader
│   │   ├── page.tsx            # Governance Dashboard
│   │   ├── audit-log/          # Audit Log Explorer
│   │   ├── policy-engine/      # Policy Engine
│   │   ├── board-reports/      # Board Report Builder
│   │   ├── nlq/                # Natural Language Query
│   │   └── ai-agents/          # Agent Trust Panel
│   ├── api/
│   │   ├── summarize/          # POST → Claude: executive dashboard summary
│   │   └── explain-event/      # POST → Claude: causal analysis for a single audit event
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── layout/                 # Sidebar, TopHeader
│   ├── dashboard/              # KpiCard, AlertFeed, AlertDrawer, ModelHealthTable, GovernanceScoreChart, SummaryModal
│   ├── audit-log/              # AuditLogFilters, AuditLogTable, AuditLogDrawer, SiemModal
│   ├── policy/                 # PolicyList, PolicyBuilder, PolicyRuleEditor
│   ├── nlq/                    # NlqInput, NlqResultTable, NlqSuggestions
│   └── shared/                 # PageHeader, StatusBadge, LoadingSkeleton, SortTh, QueryProvider
├── hooks/                      # useAuditLog, useGovernanceMetrics, useModelHealth, useAlerts, usePolicies, useNlq, useWebSocket
├── lib/                        # api-client, exportAuditLog, parseNlq, useSortable, query-client, websocket-client, utils
├── stores/                     # ui-store (sidebar), alerts-store (Zustand)
└── types/                      # api.ts, audit.ts, governance.ts, policy.ts
```

### API (`apps/api`)

- **Language**: Go 1.22+
- **Framework**: Fiber v2
- **Database**: PostgreSQL 16 (TimescaleDB) via pgx
- **Auth**: Tenant-scoped queries (multi-tenant ready)

#### Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Liveness check |
| `GET` | `/api/v1/governance/metrics` | KPI summary (score, violations, models) + 6-week trend |
| `GET` | `/api/v1/governance/models` | Per-model health: confidence avg, governance score, inference count |
| `GET` | `/api/v1/governance/alerts` | Active governance alerts with severity |
| `GET` | `/api/v1/audit-log` | Paginated audit events (filters: `search`, `event_type`, `outcome`, `start_date`, `end_date`) |
| `GET` | `/api/v1/policies` | List all policies |
| `POST` | `/api/v1/policies` | Create a new policy |
| `PATCH` | `/api/v1/policies/:id/toggle` | Enable / disable a policy |

All endpoints accept a `tenant_id` query param (defaults to the seed tenant).

### Infrastructure (`infra/docker`)

| Service | Image | Port | Purpose |
|---|---|---|---|
| `aitc_postgres` | timescale/timescaledb:latest-pg16 | `5432` | Primary datastore — audit events, policies, models, tenants |
| `aitc_redis` | redis:7-alpine | `6379` | Cache / pub-sub (WebSocket ready) |
| `aitc_clickhouse` | clickhouse/clickhouse-server | `8123` / `9000` | Analytics-scale audit query layer (future) |

---

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | ≥ 20 |
| npm | ≥ 11 |
| Go | ≥ 1.22 |
| Docker + Docker Compose | Latest |

---

## Getting started

### 1. Start the database

```bash
npm run db:up
```

Starts PostgreSQL, Redis, and ClickHouse via Docker Compose and runs the init SQL scripts automatically.

### 2. Seed the database

```bash
cd apps/api
make seed
```

Populates tenants, AI models, audit events, and policies with realistic sample data.

### 3. Start the API

```bash
cd apps/api
make run
```

API runs on **http://localhost:8080**.

### 4. Start the frontend

From the repo root:

```bash
npm run dev
```

Or just the web app:

```bash
cd apps/web
npm run dev
```

Frontend runs on **http://localhost:3000**.

---

## Environment variables

### `apps/api/.env`

```env
API_PORT=8080
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_trust_center
REDIS_URL=redis://localhost:6379/0
```

### `apps/web/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
ANTHROPIC_API_KEY=sk-ant-...       # Required for Summarize with AI and Explain with AI features
```

---

## AI features

Both AI features call **Claude Sonnet 4.6** via server-side Next.js route handlers so the `ANTHROPIC_API_KEY` never reaches the browser.

| Feature | Where | What Claude receives |
|---|---|---|
| **Summarize with AI** | Governance Dashboard header button | Current KPI metrics, active alerts, and model health data |
| **Explain with AI** | Audit Log event detail drawer | The specific event plus every other event in the same session (causal timeline) |

---

## Audit log export

From the Audit Log Explorer, three export actions are available (all respect the current active filters):

| Action | Format | Delivery |
|---|---|---|
| **Export CSV** | Comma-separated, RFC-4180 escaped | Browser download |
| **Export JSON** | Events array + metadata (exported_at, filters, total) | Browser download |
| **SIEM Push** | CEF (Common Event Format) preview | Modal with push confirmation; target `siem.internal:514` |

Exports fetch up to 5,000 events in a single request.

---

## Common commands

| Command | What it does |
|---|---|
| `npm run dev` | Start all apps in dev mode (Turborepo) |
| `npm run build` | Build all apps and packages |
| `npm run lint` | Lint all packages |
| `npm run db:up` | Start Docker services |
| `npm run db:down` | Stop Docker services |
| `npm run db:reset` | Wipe and restart Docker volumes |
| `cd apps/api && make run` | Start the Go API |
| `cd apps/api && make seed` | Seed the database |
| `cd apps/api && make test` | Run Go tests |

---

## Design

The UI matches the **NICE CXone Mpower** design language:

- **Header**: Navy `#0B2D55` with centered CXone Mpower logo
- **Sidebar**: White, 216px, grouped navigation sections with section labels
- **Background**: Light gray `#F2F4F7`
- **Cards**: White with `#E5E7EB` borders and subtle shadow
- **Primary action**: `#2563EB` (blue)
- **AI actions**: `#7C3AED` (purple) — Summarize with AI, Explain with AI
- **Module badges**: Purple (Autopilot), Blue (Copilot), Teal (Mpower Agent)
- **Status badges**: Green (healthy/allowed), Yellow (flagged/watch), Red (blocked/critical), Blue (auto-applied)

---

## Branches

| Branch | Description |
|---|---|
| `main` | Current stable build — all features merged |
| `AI_Audit_Audit_export` | Audit log export feature (merged into main) |
| `audit_trail_new_UI` | Light-theme UI redesign |
| `ui-spacing-polish` | Spacing and layout fixes |
