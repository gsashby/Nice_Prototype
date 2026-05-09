# AI Agent Monitor

**Route:** `/ai-agents`  
**File:** `apps/web/src/app/(dashboard)/ai-agents/page.tsx`

**Status: Placeholder — not yet implemented.**

---

## Current state

The page renders a header ("AI Agent Monitor") and a single card labelled "Agent Trust Panel" with the message `"Agent monitor — coming soon"`. No data fetching, no interactive components.

---

## Intended purpose

The AI Agent Monitor is planned as a per-agent performance and trust dashboard. Based on the page description and sidebar navigation context, the intended feature set includes:

- Per-agent confidence scores over time
- Override rates (how often a human overrides the agent's recommendation)
- Recommendation history with outcomes
- Bias scoring per agent
- Agent-level filtering of the audit log

---

## What needs to be built

| Component | Description |
|---|---|
| Agent list / selector | Fetch distinct `agent_id` values from the audit log or a dedicated agents table |
| Confidence trend chart | Per-agent confidence score over time (Recharts line chart) |
| Override rate metric | Count of human-modified outcomes vs total decisions |
| Recommendation history table | Filterable audit events scoped to a single agent |
| Bias score indicator | Violation rate per agent, similar to the model-level `bias_score` in `GovernanceRepo` |
| API endpoint | `GET /api/v1/agents` or extend `GET /api/v1/audit-log` with `agent_id` filter |
