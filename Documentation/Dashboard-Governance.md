# Governance Dashboard

**Route:** `/` (root of the dashboard shell)  
**File:** `apps/web/src/app/(dashboard)/page.tsx`

The Governance Dashboard is the landing page of the AI Trust Center. It gives a real-time snapshot of AI decision-making health across all NICE CXone Mpower modules.

---

## Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Page Header — title + action buttons                         │
├──────────────┬──────────────┬──────────────┬────────────────┤
│ KPI: AI      │ KPI: Avg     │ KPI: Policy  │ KPI: Compliance│
│ Decisions    │ Confidence   │ Violations   │ Coverage       │
├──────────────────────────────────┬──────────────────────────┤
│ Governance Score Chart (2fr)     │ Active Alerts Feed (1fr) │
├──────────────────────────────────┴──────────────────────────┤
│ Module Health Table (full width)                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Header actions

| Button | Colour | Behaviour |
|---|---|---|
| Time period dropdown | White/border | UI only — does not yet filter data |
| Export | White/border | UI only — not wired up |
| Board Report | Blue `#2563EB` | UI only — navigates to Board Reports page (not yet linked) |
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

## Data dependencies

| Hook | API endpoint | Used by |
|---|---|---|
| `useGovernanceMetrics` | `GET /api/v1/governance/metrics` | KPI cards, chart, Summarize with AI payload |
| `useAlerts` | `GET /api/v1/governance/alerts` | Alert feed, Summarize with AI payload |
| `useModelHealth` | `GET /api/v1/governance/models` | Module health table, Summarize with AI payload |
| `useAuditLog` | `GET /api/v1/audit-log` | Alert drawer mini event list |
