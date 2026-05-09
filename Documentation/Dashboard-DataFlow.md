# Data Flow Visualizer

**Route:** `/data-flow`  
**File:** `apps/web/src/app/(dashboard)/data-flow/page.tsx`  
**Component:** `apps/web/src/components/data-flow/FlowGraph.tsx`

**Status: Fully implemented.**

---

## Overview

The Data Flow Visualizer provides a real-time interactive diagram of how AI requests move through the NICE AI Trust Center governance pipeline. It is aimed at compliance officers, auditors, and system architects who need to understand the governance lifecycle for an AI request — from submission through policy checks, model inference, audit logging, and governance reporting.

---

## Layout

The page uses a two-panel layout:

- **Left panel (main):** An interactive SVG pipeline diagram — the `FlowGraph` component
- **Right panel (280 px):** Three stacked cards — node detail, pipeline health KPIs, recent audit events

---

## Pipeline diagram (`FlowGraph`)

The SVG diagram shows nine nodes across two rows connected by animated, colour-coded edges.

### Nodes

**Request Pipeline (top row):**

| Node | Label | Role |
|---|---|---|
| `agent` | AI Agent | Request source — the originating agent or end user |
| `policy` | Policy Engine | Governance gate — checks every request against active policies |
| `model` | AI Model | AI inference — processes approved requests (Claude, GPT-4, etc.) |
| `response` | Response Filter | Output validator — checks model output for post-inference policy violations |
| `client` | Client Output | Destination — receives the governed, validated response |

**Governance Layer (bottom row):**

| Node | Label | Role |
|---|---|---|
| `audit` | Audit Logger | Event capture — records every event for compliance audit trail |
| `postgres` | PostgreSQL | Persistence — TimescaleDB stores audit events as a time-series hypertable |
| `alert` | Alert System | Violation dispatcher — triggers real-time alerts on governance threshold breaches |
| `governance` | Governance | KPI aggregation — feeds the Governance Dashboard, board reports, and NLQ |

### Edges

Nine animated edges connect the nodes:

| Edge | From → To | Colour | Meaning |
|---|---|---|---|
| e1 | Agent → Policy | Blue | Incoming request |
| e2 | Policy → Model | Amber | Approved request forwarded |
| e3 | Model → Response | Purple | Raw model output |
| e4 | Response → Client | Green | Validated, governed response |
| e5 | Policy → Audit | Amber (vertical) | All events logged |
| e6 | Model → Audit | Purple (bezier) | Inference log |
| e7 | Audit → PostgreSQL | Blue | Event persistence |
| e8 | PostgreSQL → Alert | Green | Metrics feed |
| e9 | Alert → Governance | Red | Alert escalation |

### Animation

Edges are animated using native SVG `<animate>` elements that cycle `stroke-dashoffset` from 0 to −14, creating a moving-dash "data flow" effect. Each edge animates at a different speed (0.7 s–1.4 s) to suggest different throughput levels. The animation is entirely CSS-free — no keyframes are required in the global stylesheet.

The **Pause / Resume flow** button in the page header conditionally renders the animated overlay paths, instantly freezing or restarting all edge animations.

### Node interaction

Clicking any node selects it (highlighted with a colour-matched glow ring) and populates the **Node Detail** card in the right panel. Clicking the same node again deselects it.

---

## Right panel

### Node Detail card

When a node is selected, shows:

- **Role badge** — e.g. "Governance Gate", "AI Inference", "Persistence Layer"
- **Node name** — formatted display name
- **Description** — a plain-English explanation of what the node does in the governance lifecycle

When no node is selected, shows a numbered **Pipeline Steps** list (9 steps) describing a complete AI request journey from submission to governance reporting.

### Pipeline Health KPIs

Four live metric chips drawn from `useGovernanceMetrics()`:

| KPI | Source field |
|---|---|
| Governance Score | `governance_score` |
| Active Policies | `active_policies` |
| Violations (24h) | `policy_violations_24h` |
| Models Monitored | `models_monitored` |

### Recent Events feed

Last 6 audit events from `useAuditLog({ page: 1, pageSize: 8 })`. Each row shows outcome badge (allowed / blocked / flagged), event type, and timestamp.

---

## Colour coding

| Colour | Used for |
|---|---|
| Blue `#2563EB` | Request / data flow, Audit Logger |
| Amber `#D97706` | Policy Engine governance events |
| Purple `#7C3AED` | AI Model inference, Governance Dashboard |
| Green `#059669` | Response Filter validation, PostgreSQL persistence |
| Red `#DC2626` | Alert System violations |
| Gray `#374151` | Client Output (neutral endpoint) |

---

## Component reference

| Component | File | Purpose |
|---|---|---|
| `DataFlowPage` | `data-flow/page.tsx` | Page layout, state management, right panel |
| `FlowGraph` | `data-flow/FlowGraph.tsx` | SVG diagram with nodes, edges, animation |

### `FlowGraph` props

```ts
{
  selectedNode: NodeId | null;         // currently selected node
  onNodeClick: (id: NodeId) => void;   // called on node click
  animated: boolean;                   // controls edge animation
}

type NodeId =
  | 'agent' | 'policy' | 'model' | 'response' | 'client'
  | 'audit' | 'postgres' | 'alert' | 'governance';
```

---

## Legend

The diagram includes a visual legend below the SVG key that maps each edge colour to its semantic meaning (request flow, governance events, AI inference log, persistence/metrics, violation alerts).
