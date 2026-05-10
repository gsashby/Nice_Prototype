# Governance Dashboard

**Route:** `/` (root of the dashboard shell)  
**File:** `apps/web/src/app/(dashboard)/page.tsx`

The Governance Dashboard is the landing page of the AI Trust Center. It gives a real-time snapshot of AI decision-making health across all NICE CXone Mpower modules.

---

## Layout

```
┌─────────────────────────────────────────────────────────────┐
│ NLQ Panel — search input + suggested query chips             │
│  └─ Query Results (appears on submit, collapsible)           │
├─────────────────────────────────────────────────────────────┤
│ Page Header — title + action buttons                         │
├──────────────┬──────────────┬──────────────┬────────────────┤
│ KPI: AI      │ KPI: Avg     │ KPI: Policy  │ KPI: Compliance│
│ Decisions    │ Confidence   │ Violations   │ Coverage       │
├──────────────────────────────────┬──────────────────────────┤
│ Governance Score Chart (2fr)     │ Active Alerts Feed (1fr) │
├──────────────────────────────────┴──────────────────────────┤
│ Module Health Table (full width)                             │
├─────────────────────────────────────────────────────────────┤
│ Recommended Actions (full width)                             │
│  └─ Recommendation Drawer (right fly-out, on row click)      │
└─────────────────────────────────────────────────────────────┘
```

---

## Natural Language Query Panel

Component: `NlqPanel` (`components/nlq/NlqPanel.tsx`)

Embedded at the top of the dashboard. Always shows the search input and five suggested query chips. The query results card appears below only after a query is submitted and can be collapsed/expanded by clicking the "Query Results" header. Submitting a new query re-expands results automatically.

See `Documentation/Dashboard-NLQ.md` for full NLQ documentation.

---

## Header actions

| Button | Colour | Behaviour |
|---|---|---|
| Time period dropdown | White/border | UI only — does not yet filter data |
| Export | White/border | UI only — not wired up |
| Board Report | Blue `#2563EB` | Navigates to `/board-reports` |
| Summarize with AI | Purple `#7C3AED` | Opens `SummaryModal`, calls `POST /api/summarize` via Claude |

---

## KPI Cards

Component: `KpiCard`  
Data source: `useGovernanceMetrics()` → `GET /api/v1/governance/metrics`  
Refresh: every 30 seconds

| Card | Value source | Trend indicator |
|---|---|---|
| AI Decisions Today | Hardcoded `62,847` | Up (hardcoded `+8.3%`) |
| Avg Confidence Score | `data.governance_score` from API | Up (hardcoded delta) |
| Policy Violations (7d) | `data.policy_violations_24h` from API | Down (red, hardcoded delta) |
| Compliance Coverage | Hardcoded `100%` | Stable |

Each card has a 4px colour-coded accent bar at the top (blue, green, red, teal), a large value, a delta string, and a trend arrow icon.

While loading, four `LoadingSkeleton` placeholders of height `116px` are shown. On API error, a red error banner spans all four columns.

---

## Governance Score Chart

Component: `GovernanceScoreChart`  
Library: **Recharts** (`LineChart`, `Line`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `ResponsiveContainer`)  
Data source: `data.trend` from `useGovernanceMetrics()`

Displays a 6-week rolling average of the governance/confidence score as a line chart. The Y axis is fixed between 50–100. Each data point is labelled by week (e.g. `"Apr 07"`).

If no trend data is available (e.g. the database has not been seeded), a placeholder message is shown instead of the chart.

---

## Active Alerts Feed

Component: `AlertFeed`  
Data source: `useAlerts()` → `GET /api/v1/governance/alerts`  
Refresh: every 30 seconds  
Max displayed: 20 alerts (scrollable list, max height 420px)

Each alert row shows:
- Severity dot (red = critical, amber = high/medium, blue = low)
- Alert title and description
- Relative timestamp (e.g. "3 minutes ago") via `date-fns` `formatDistanceToNow`
- **Investigate** button → opens `AlertDrawer`

A red pill badge in the header shows the count of critical alerts.

### Alert Drawer

Opens as a right-side panel (440px wide) with a CSS `translateX` slide-in animation.

Contents:
- Alert title, relative timestamp, severity dot
- Full description text
- Severity/policy callout box (colour varies by severity level)
- **Related Audit Events** — fetches up to 5 audit events filtered by the outcome matching that severity level (`blocked` for critical/high, `flagged` for medium/low) via `useAuditLog`
- Action buttons: **Acknowledge** (removes from Zustand alerts store + closes), **Escalate** (shows confirmation, closes after 1.2s), **Dismiss** (closes after 0.8s)

Closing: backdrop click, Escape key, or any action button.

---

## Module Health Table

Component: `ModelHealthTable`  
Data source: `useModelHealth()` → `GET /api/v1/governance/models`  
Refresh: every 30 seconds

Sortable columns (via `useSortable` hook): Module, Model Version, Avg Confidence, Governance Score.

| Column | Source |
|---|---|
| Module | `model.name` — coloured badge (purple = Autopilot, blue = Copilot, teal = Mpower) |
| Model Version | `model.type` |
| Coverage | Hardcoded `100%` |
| Avg Conf. | `model.confidence_avg` (last 7 days from API) |
| Gov. Score | `model.governance_score` |
| Status | Derived: ≥85% → Healthy (green), ≥70% → Watch (amber), <70% → Critical (red) |

---

## Summarize with AI

Component: `SummaryModal`  
Triggered by: "Summarize with AI" purple button in the header  
API call: `POST /api/summarize` (Next.js server-side route → Claude Sonnet 4.6)

The modal opens immediately with a loading spinner. The page passes the following live data to Claude:
- Current governance score and policy violations count (from `useGovernanceMetrics`)
- All active alerts (from `useAlerts`)
- All model health records (from `useModelHealth`)
- Hardcoded values for AI decisions today (`62,847`) and compliance coverage (`100%`)

Claude returns a 3–4 sentence executive summary followed by "Key Risks" and "Recommended Actions" sections, rendered as plain text in the modal.

See `Documentation/API-AnthropicClaude.md` for the full prompt and token details.

---

---

## Recommended Actions

Component: `RecommendedActions` (`components/dashboard/RecommendedActions.tsx`)  
Data source: Static — no API call required to render the panel

A full-width panel below the Module Health Table surfacing 10 curated governance recommendations across 4 colour-coded categories.

### Categories

| Category | Colour | Icon | Count |
|---|---|---|---|
| Policy & Compliance | Blue `#2563EB` | ShieldCheck | 3 |
| Model Performance | Green `#16A34A` | Activity | 3 |
| Security & Access | Red `#DC2626` | Lock | 2 |
| Operational | Purple `#7C3AED` | Settings | 2 |

Each category renders as a coloured header strip followed by its recommendation rows sorted by priority (critical → high → medium → low). The panel header shows total counts of critical and high items as coloured badges.

### Recommendation rows

Each row shows:
- Priority dot (colour-coded: red = critical, orange = high, amber = medium, blue = low)
- Title (bold) and summary (muted)
- Priority badge and module badge
- Chevron — clicking opens the `RecommendationDrawer`

---

## Recommendation Drawer

Component: `RecommendationDrawer` (`components/dashboard/RecommendationDrawer.tsx`)

A right fly-out panel (480px wide) that slides in with a CSS `translateX` animation when a recommendation row is clicked.

**Closing:** backdrop click, Escape key, or the × button.

**State resets** (checked items, AI analysis) whenever a different recommendation is opened.

### Drawer sections (top to bottom)

**Header** — category badge, priority badge, module badge, title, summary. Badges and category name are colour-coded to match the panel.

**About this issue** — detailed prose description explaining the root cause, impact, and governance implications.

**Recommended Actions** — a pre-defined checklist of 5 specific, concrete action steps. Each step is an interactive checkbox:
- Click to toggle — ticked items show a green `CheckSquare` icon and strikethrough text
- A progress counter (`N of 5 actions completed`) appears once any step is ticked
- Checklist state is local to the drawer session — not persisted across page reloads

**AI Analysis** — purple-bordered section at the bottom. Not loaded automatically. Shows a description and a **Get AI Analysis** button (purple, `#7C3AED`). On click:
1. Calls `POST /api/recommend-action` with the recommendation + current dashboard context (governance score, violation count, alert count)
2. Shows a skeleton loader (3 animated bars) while waiting
3. Renders Claude's narrative analysis on completion
4. The button disappears after the request is made to prevent duplicate calls
5. On error, shows a red inline error message

---

## Data dependencies

| Hook | API endpoint | Used by |
|---|---|---|
| `useGovernanceMetrics` | `GET /api/v1/governance/metrics` | KPI cards, chart, Summarize with AI payload, Recommendation Drawer context |
| `useAlerts` | `GET /api/v1/governance/alerts` | Alert feed, Summarize with AI payload, Recommendation Drawer context |
| `useModelHealth` | `GET /api/v1/governance/models` | Module health table, Summarize with AI payload |
| `useAuditLog` | `GET /api/v1/audit-log` | Alert drawer mini event list; NLQ result table |
| _(none — static data)_ | — | `RecommendedActions` panel |
| `POST /api/recommend-action` | Next.js route → Claude | `RecommendationDrawer` AI Analysis (on demand) |
