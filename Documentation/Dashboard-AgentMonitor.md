# AI Agent Monitor

**Route:** `/ai-agents`  
**Files:**
- `apps/web/src/app/(dashboard)/ai-agents/page.tsx`
- `apps/web/src/hooks/useAgents.ts`
- `apps/web/src/components/agent-monitor/AgentTable.tsx`
- `apps/web/src/components/agent-monitor/AgentDetailDrawer.tsx`

**Status: Fully implemented.** Data is aggregated client-side from `GET /api/v1/audit-log` (up to 200 events per period). No dedicated `/api/v1/agents` endpoint is required.

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

## Page layout

```
┌─ Page header: "Agent Trust Panel"  [Time range selector] ─────────────┐
├─ Description block ────────────────────────────────────────────────────┤
│  Explains trust score formula and how to use the panel                 │
├─ Fleet KPI chips ──────────────────────────────────────────────────────┤
│  Active Agents │ Fleet Block Rate │ Fleet Avg Confidence │ High-Risk   │
├─ Agent table ──────────────────────────────────────────────────────────┤
│  Search bar                                                            │
│  Agent ID │ Trust Score     │ Events │ Sessions │ Block% │ Conf% │ …  │
│  ─────────────────────────────────────────────────────────────────── │
│  agent-007 │ ████████ 91.2% Healthy │ 847 │ 43 │ 2.1% │ 83.4% │ …  │
│  agent-012 │ ████░░░░ 43.0% Critical│ 312 │ 18 │ 31.4%│ 61.2% │ …  │
└────────────────────────────────────────────────────────────────────────┘

┌─ Agent detail drawer (slide-in on row click) ──────────────────────────┐
│  agent-012                                                             │
│  43 events · 18 sessions · last seen 2 hours ago                      │
│                                                                        │
│  Trust Score ──────────────────────────────────────────────────────── │
│  43.0%  Critical  [████░░░░░░░░░░░░░░░░░░░░░░]                        │
│  Based on allow rate (50%), avg confidence (35%), violation-free (15%)│
│                                                                        │
│  Outcome Breakdown ─────────────────────────────────────────────────  │
│  [████████████░░░░░░████████████]                                      │
│  ● Allowed 22 (51%)  ● Flagged 8 (19%)  ● Blocked 13 (30%)           │
│                                                                        │
│  Key Metrics ───────────────────────────────────────────────────────  │
│  Block Rate: 30.2%  Avg Confidence: 61.2%  Violations: 7  Sessions: 18│
│                                                                        │
│  Top Policy Violations ─────────────────────────────────────────────  │
│  [Confidence Floor ×5] [Bias Threshold ×2]                            │
│                                                                        │
│  Recent Sessions ───────────────────────────────────────────────────  │
│  sess-abc │ 4 events │ blocked │ May 9 14:22                          │
│  ...                                                                   │
│                                                                        │
│  [Close]                           [View All Events →]                │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Description block

A plain-text paragraph rendered between the page header and the KPI chips. Explains:
- What a Trust Score is and how it is computed (the three weighted inputs)
- The <70% high-risk threshold
- How to use the page (click a row to open the detail drawer)

---

## Fleet KPI chips

Four chips derived client-side from all agent summaries for the selected period:

| KPI | Calculation | Colour |
|---|---|---|
| Active Agents | Count of distinct `agent_id` values | Neutral |
| Fleet Block Rate | Total blocked events / total events across all agents | Red ≥ 10%, Amber ≥ 5%, Green otherwise |
| Fleet Avg Confidence | Weighted mean of `avg_confidence` (weighted by event count) | Green ≥ 85%, Amber ≥ 70%, Red otherwise |
| High-Risk Agents | Count of agents with trust score < 70% | Red if > 0, Gray if 0 |

Each chip includes a subtitle: "Active Agents" shows the event sample size; "High-Risk Agents" shows `"trust score < 70%"`.

---

## Agent table (`AgentTable`)

One row per distinct `agent_id` found in the sampled events. Sortable on all columns via `useSortable`; searchable by agent ID substring.

| Column | Source | Display |
|---|---|---|
| Agent ID | `agent_id` | Monospace bold; clicking opens the detail drawer |
| Trust Score | Computed (see below) | Progress bar + coloured percentage + Healthy/Watch/Critical badge |
| Events | `total_events` | Locale-formatted integer |
| Sessions | `session_count` | Distinct `session_id` values in the agent's events |
| Block Rate | `block_rate` | `X.X%`, coloured red ≥ 15%, amber ≥ 5%, gray otherwise |
| Avg Conf. | `avg_confidence` | `XX.X%`, coloured green ≥ 85%, amber ≥ 70%, red otherwise |
| Violations | `total_violations` | Red pill badge when > 0; plain `0` otherwise |
| Last Seen | `last_seen` | Relative time via `date-fns` `formatDistanceToNow` |

### Trust Score formula

Computed client-side in `useAgents` from the sampled events for each agent:

```
trust_score = (allow_rate × 0.50)
            + (avg_confidence × 0.35)
            + (no_violation_rate × 0.15)
            × 100
```

| Input | Definition |
|---|---|
| `allow_rate` | `allowed_count / total_events` |
| `avg_confidence` | Mean of `confidence_score` across the agent's events |
| `no_violation_rate` | Events where `policy_violations.length === 0` / `total_events` |

Thresholds: **Healthy ≥ 85%, Watch ≥ 70%, Critical < 70%** — matching conventions across the platform.

---

## Agent detail drawer (`AgentDetailDrawer`)

Opens on row click; closes on Escape, backdrop click, or Close button.

### 1. Trust Score gauge

Progress bar from 0–100% with colour-coded fill (green/amber/red). Shows the score percentage, Healthy/Watch/Critical badge, and a subtitle explaining the formula weights.

### 2. Outcome breakdown bar

A proportional horizontal bar divided into green (allowed), amber (flagged), and red (blocked) segments. Below the bar: a three-item legend with event counts and percentages.

### 3. Key metrics

A label/value grid showing:
- Block Rate (coloured by threshold)
- Avg Confidence (coloured by threshold)
- Total Violations
- Session Count

### 4. Top policy violations

Up to 6 most-frequent violation names aggregated from `policy_violations` arrays across all the agent's events. Each renders as a red pill badge with a small count bubble. Section hidden if the agent has no violations.

### 5. Recent sessions

Last 8 sessions derived from the agent's events, sorted descending by start time. Columns: Session ID (truncated to 16 chars, monospace), Events, Worst Outcome badge, Started (formatted date/time). Clicking a session row navigates to `/audit-log?search={session_id}` and closes the drawer.

### Footer actions

- **Close** — dismisses the drawer
- **View All Events** — navigates to `/audit-log?search={agent_id}`, filtering the full audit log to this agent's history

---

## Data hook — `useAgents`

**File:** `apps/web/src/hooks/useAgents.ts`

```ts
function useAgents(startDate?: string): {
  agents: AgentSummary[];
  fleet: FleetSummary | null;
  isLoading: boolean;
  isError: boolean;
  eventTotal: number;   // raw total from the API (may exceed 200)
}

type AgentSummary = {
  agent_id: string;
  trust_score: number;       // 0–100
  total_events: number;
  allowed_count: number;
  flagged_count: number;
  blocked_count: number;
  block_rate: number;        // 0–1
  avg_confidence: number;    // 0–1
  total_violations: number;
  session_count: number;
  last_seen: string;         // ISO 8601
  events: AuditEvent[];      // raw events for this agent (used by drawer)
};

type FleetSummary = {
  active_agents: number;
  fleet_block_rate: number;       // 0–1
  fleet_avg_confidence: number;   // 0–1
  high_risk_count: number;
};
```

Fetches `GET /api/v1/audit-log` with `page=1, page_size=200` and an optional `startDate`. Groups events by `agent_id` using `useMemo`. Trust score, fleet aggregates, and all derived metrics are computed in the memo — no extra API calls.

---

## Component reference

| Component | File | Purpose |
|---|---|---|
| `AiAgentsPage` | `ai-agents/page.tsx` | Page layout, period state, description block, KPI chips |
| `AgentTable` | `components/agent-monitor/AgentTable.tsx` | Searchable, sortable table with trust score bars |
| `AgentDetailDrawer` | `components/agent-monitor/AgentDetailDrawer.tsx` | Slide-in drawer: gauge, outcome bar, violations, sessions |

---

## Data dependencies

| Hook | API endpoint | Used by |
|---|---|---|
| `useAgents(startDate?)` | `GET /api/v1/audit-log?page_size=200` | All page data — agents, fleet KPIs |

---

## Known limitations

| Limitation | Impact |
|---|---|
| 200-event sample cap | The Go API clamps `page_size` to 200. For busy periods this means only the most-recent 200 events are analysed — agents with older events may show incomplete metrics |
| No confidence trend chart | Requires time-bucketed data across multiple days; not available without a dedicated API endpoint or multiple sequential fetches |
| Client-side aggregation cost | Grouping 200 events in `useMemo` is negligible, but this approach does not scale to thousands of events per period |

---

## Future improvement — dedicated Go API endpoint

A `GET /api/v1/agents` endpoint using `GROUP BY agent_id` in SQL would eliminate the 200-event cap and compute all metrics server-side far more efficiently. The SQL backbone would be:

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
  AND event_time >= $2
GROUP BY agent_id
ORDER BY total_events DESC;
```

Trust score, `block_rate`, `total_violations`, and `no_violation_rate` would be computed in Go from the raw aggregates. No schema changes are required — all data is in `audit_events`.
