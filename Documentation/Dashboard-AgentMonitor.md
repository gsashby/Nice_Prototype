# AI Agent Monitor

**Route:** `/ai-agents`  
**File:** `apps/web/src/app/(dashboard)/ai-agents/page.tsx`  
**Status: Placeholder — shows "Agent monitor — coming soon".**

---

## Purpose

The AI Agent Monitor gives compliance officers and platform administrators a per-agent view of AI governance health. Where the Governance Dashboard and Audit Log show system-wide trends, this page answers agent-level questions:

- Which agents are generating the most policy violations?
- Is a specific agent's confidence score degrading over time?
- What is an agent's block rate, and how does it compare to the fleet average?
- Which sessions should be reviewed based on trust score?

---

## Data foundation

There is no dedicated `agents` table. All agent data must be aggregated from `audit_events` using `GROUP BY agent_id`. The seed data contains up to **20 distinct agents** (`agent-001` through `agent-020`), each with multiple sessions and events. The existing `AuditEvent` record provides all fields needed:

| Field | Used for |
|---|---|
| `agent_id` | Grouping key |
| `session_id` | Session count, session-level drill-down |
| `outcome` | Block rate, flag rate, allow rate |
| `confidence_score` | Average confidence, trend over time |
| `policy_violations` | Violation frequency by policy name |
| `event_type` | Event mix (inference, policy_check, bias_scan, session_start) |
| `event_time` | Time-series trend, last-seen timestamp |
| `model_name` | Which models an agent uses |

---

## Intended page layout

```
┌─ Page header: "AI Agent Monitor" ─────────────────────────────────────┐
│  [Fleet health KPI chips]  [Time range selector]  [Export CSV button] │
└────────────────────────────────────────────────────────────────────────┘

┌─ Agent table ──────────────────────────────────────────────────────────┐
│  Search bar                                                            │
│  Agent ID │ Trust Score │ Events │ Block Rate │ Confidence │ Last Seen │
│  ──────────────────────────────────────────────────────────────────── │
│  agent-007 │ ████ 91%   │ 847    │ 2.1%       │ 83.4%      │ 2m ago   │
│  agent-012 │ ██░░ 43%   │ 312    │ 31.4%      │ 61.2%      │ 1h ago   │
│  ...                                                                   │
└────────────────────────────────────────────────────────────────────────┘

┌─ Agent detail drawer (slide-in on row click) ──────────────────────────┐
│  agent-012                                                             │
│  Trust Score: 43% ▼ Critical                                          │
│                                                                        │
│  [Confidence trend chart — last 7d]                                   │
│  [Outcome breakdown: allowed / flagged / blocked bar]                 │
│  [Top policy violations list]                                         │
│  [Recent sessions table]                                              │
│  [View all events in Audit Log →]                                     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Fleet health KPI chips

Four headline metrics across all agents for the selected time period:

| KPI | Calculation |
|---|---|
| Active Agents | Distinct `agent_id` values with at least one event in the period |
| Fleet Block Rate | `COUNT(*) WHERE outcome = 'blocked' / COUNT(*)` across all agents |
| Fleet Avg Confidence | `AVG(confidence_score)` across all events |
| High-Risk Agents | Count of agents with trust score < 70 % |

---

## Agent table

One row per distinct `agent_id`. Sortable on all numeric columns, searchable by agent ID substring.

| Column | Source | Notes |
|---|---|---|
| Agent ID | `agent_id` | Monospaced; clicking opens detail drawer |
| Trust Score | Derived (see below) | Colour-coded bar: green ≥ 85 %, amber ≥ 70 %, red < 70 % |
| Events | `COUNT(*)` | Total events in selected period |
| Sessions | `COUNT(DISTINCT session_id)` | Unique sessions |
| Block Rate | `COUNT WHERE outcome = 'blocked' / COUNT(*)` | Formatted as `X.X%` |
| Avg Confidence | `AVG(confidence_score)` | Formatted as `XX.X%` |
| Violations | `SUM(array_length(policy_violations, 1))` | Total policy violations |
| Last Seen | `MAX(event_time)` | Relative time ("3m ago", "2h ago") |

### Trust Score formula

A synthetic 0–100 score computed server-side from three weighted inputs:

```
trust_score = (allow_rate × 0.50)
            + (avg_confidence × 0.35)
            + (no_violation_rate × 0.15)
```

Where:
- `allow_rate` = `allowed_count / total_count` (0–1)
- `avg_confidence` = mean `confidence_score` (0–1)
- `no_violation_rate` = `events_with_zero_violations / total_count` (0–1)

Thresholds match governance score conventions elsewhere in the platform: **Healthy ≥ 85 %, Watch ≥ 70 %, Critical < 70 %**.

---

## Agent detail drawer

Opens on row click. Contains four sections:

### 1. Confidence trend (line chart)

`confidence_score` bucketed into daily averages for the selected period using Recharts `LineChart` — the same component pattern as the Governance Dashboard trend chart. Y-axis: 0–100 %. Reference line at 70 % (minimum acceptable threshold).

### 2. Outcome breakdown

Stacked bar showing `allowed` / `flagged` / `blocked` counts for the agent. Colours match the existing outcome badge palette (green / amber / red).

### 3. Top policy violations

The five most-triggered policy names for this agent, with occurrence count and percentage of total events. Derived by unnesting `policy_violations` JSONB arrays and grouping by violation name.

### 4. Recent sessions

Last 10 sessions (`GROUP BY session_id ORDER BY MAX(event_time) DESC`):

| Column | Source |
|---|---|
| Session ID | `session_id` (truncated, monospaced) |
| Events | `COUNT(*)` |
| Outcome | Worst outcome in session (blocked > flagged > allowed) |
| Duration | `MAX(event_time) - MIN(event_time)` |
| Started | `MIN(event_time)` |

Clicking a session ID navigates to `/audit-log?search={session_id}`, using the existing search filter that matches `session_id ILIKE '%{value}%'` in the Go API.

### Footer

**"View all events in Audit Log"** — navigates to `/audit-log?search={agent_id}`, filtering to that agent's full history.

---

## What needs to be built

### Go API — new endpoints

#### `GET /api/v1/agents`

Returns per-agent aggregates for the selected period. Feeds the agent table and fleet KPI chips.

Query params: `start_date`, `end_date`, `tenant_id`

```json
{
  "agents": [
    {
      "agent_id": "agent-007",
      "trust_score": 91.2,
      "total_events": 847,
      "total_sessions": 43,
      "allowed_count": 829,
      "flagged_count": 12,
      "blocked_count": 6,
      "block_rate": 0.0071,
      "avg_confidence": 0.834,
      "total_violations": 18,
      "last_seen": "2026-05-09T14:22:00Z"
    }
  ],
  "fleet": {
    "active_agents": 18,
    "fleet_block_rate": 0.041,
    "fleet_avg_confidence": 0.791,
    "high_risk_count": 3
  }
}
```

SQL backbone:

```sql
SELECT
  agent_id,
  COUNT(*)                                           AS total_events,
  COUNT(DISTINCT session_id)                         AS total_sessions,
  COUNT(*) FILTER (WHERE outcome = 'allowed')        AS allowed_count,
  COUNT(*) FILTER (WHERE outcome = 'flagged')        AS flagged_count,
  COUNT(*) FILTER (WHERE outcome = 'blocked')        AS blocked_count,
  ROUND(AVG(confidence_score)::numeric, 4)           AS avg_confidence,
  MAX(event_time)                                    AS last_seen
FROM audit_events
WHERE tenant_id = $1
  AND event_time BETWEEN $2 AND $3
GROUP BY agent_id
ORDER BY total_events DESC;
```

Trust score, `block_rate`, and `total_violations` are computed in Go from the raw aggregates. Policy violation unnesting uses `jsonb_array_elements_text(policy_violations)` in a separate query per agent (or a lateral join for the top-5 violations).

---

#### `GET /api/v1/agents/:id/sessions`

Returns session-level aggregates for a single agent. Feeds the detail drawer sessions table.

```json
{
  "sessions": [
    {
      "session_id": "sess-abc123",
      "event_count": 14,
      "worst_outcome": "blocked",
      "started_at": "2026-05-09T12:00:00Z",
      "ended_at": "2026-05-09T12:04:22Z",
      "duration_seconds": 262
    }
  ]
}
```

---

#### `GET /api/v1/agents/:id/trend`

Returns daily-bucketed confidence and event counts. Feeds the drawer trend chart. Uses TimescaleDB `time_bucket('1 day', event_time)` for efficient partitioned aggregation.

```json
{
  "trend": [
    {
      "date": "2026-05-03",
      "avg_confidence": 0.81,
      "event_count": 42,
      "block_count": 2
    }
  ]
}
```

---

### Frontend — new hooks

**`useAgents(filters)`** — `apps/web/src/hooks/useAgents.ts`

```ts
type AgentFilters = { startDate?: string; endDate?: string };

type AgentSummary = {
  agent_id: string;
  trust_score: number;
  total_events: number;
  total_sessions: number;
  allowed_count: number;
  flagged_count: number;
  blocked_count: number;
  block_rate: number;
  avg_confidence: number;
  total_violations: number;
  last_seen: string;
};

type FleetSummary = {
  active_agents: number;
  fleet_block_rate: number;
  fleet_avg_confidence: number;
  high_risk_count: number;
};

// Calls: GET /api/v1/agents
// Query key: ['agents', filters]
// Refetch interval: 60 seconds
```

**`useAgentSessions(agentId)`** — calls `GET /api/v1/agents/:id/sessions`. Only fetches when a drawer is open (`enabled: !!agentId`).

**`useAgentTrend(agentId)`** — calls `GET /api/v1/agents/:id/trend`. Only fetches when a drawer is open.

---

### Frontend — new components

| Component | File | Purpose |
|---|---|---|
| `AgentMonitorPage` | `ai-agents/page.tsx` | Page layout, time range state, KPI chips, orchestration |
| `AgentTable` | `components/agent-monitor/AgentTable.tsx` | Searchable, sortable table with trust score bars |
| `AgentDetailDrawer` | `components/agent-monitor/AgentDetailDrawer.tsx` | Slide-in drawer with all four sub-sections |
| `AgentTrendChart` | `components/agent-monitor/AgentTrendChart.tsx` | Recharts `LineChart` of daily confidence |
| `AgentOutcomeBar` | `components/agent-monitor/AgentOutcomeBar.tsx` | Stacked bar: allowed / flagged / blocked |
| `AgentSessionsTable` | `components/agent-monitor/AgentSessionsTable.tsx` | Recent sessions with worst-outcome badge |

---

## Implementation notes

**No schema changes required.** All features are derived from `audit_events`. No new tables or migrations needed.

**Time range selector** — reuse the period pattern from the Board Report Builder (`7d / 30d / 90d / custom`), converting to ISO 8601 `start_date` / `end_date` params on the API call.

**Policy violation unnesting** — use `jsonb_array_elements_text(policy_violations)` inside a lateral join or subquery in the Go handler. Aggregate server-side to avoid shipping full event payloads to the frontend.

**Drawer data loading** — trigger `useAgentSessions` and `useAgentTrend` only when the drawer opens (pass `agentId` as the key; use TanStack Query `enabled` option). This avoids pre-fetching all 20 agents' trend data upfront.

**Export CSV** — follows the same `triggerDownload` pattern as `exportAuditLog.ts`. Suggested columns: Agent ID, Trust Score, Events, Sessions, Block Rate, Avg Confidence, Violations, Last Seen.

**Deep-links** — both the detail drawer footer and session row clicks use the existing `/audit-log?search={value}` route. The Go API's search clause already matches `agent_id` and `session_id` via `ILIKE`, so no API changes are needed for deep-linking.

**Recharts reuse** — `AgentTrendChart` can be a thin wrapper around the same `LineChart` / `ResponsiveContainer` pattern already used in `GovernanceScoreChart.tsx`. Pass `data`, `dataKey`, and an optional `referenceLineY` prop.
