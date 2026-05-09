# Feature Roadmap

Current state as of May 2026. Covers what is built, what is scaffolded but incomplete, and what is planned.

---

## Built and working

| Feature | Page | Notes |
|---|---|---|
| Governance Dashboard | `/` | KPI cards, 6-week trend chart, alert feed, module health table |
| Alert investigation drawer | `/` | Right-side drawer with severity callout, related audit events, Acknowledge/Escalate/Dismiss |
| Summarize with AI | `/` | Claude Sonnet 4.6 executive summary of live dashboard data |
| Audit Log Explorer | `/audit-log` | Filterable, paginated, sortable event table |
| Audit event detail drawer | `/audit-log` | Full event detail, session timeline, policy violations |
| Explain with AI (causal analysis) | `/audit-log` | Claude Sonnet 4.6 explanation of a specific event + session context |
| Audit log export — CSV | `/audit-log` | Downloads up to 5000 filtered events |
| Audit log export — JSON | `/audit-log` | Downloads with metadata envelope |
| SIEM Push preview | `/audit-log` | CEF format modal, simulated push confirmation |
| Policy Engine — list | `/policy-engine` | Sortable table of all policies with violation counts |
| Policy Engine — toggle | `/policy-engine` | Enable/disable individual policies via API |
| Policy Engine — create | `/policy-engine` | Form to create new policies with name, description, severity |
| Natural Language Query | `/nlq` | Keyword parser maps plain English to audit log filters |
| NLQ result drill-down | `/nlq` | Clickable rows open full `AuditLogDrawer` |
| NLQ suggested queries | `/nlq` | Five hardcoded suggestion chips |

---

## Scaffolded — code exists but not fully wired

| Feature | Location | What's missing |
|---|---|---|
| WebSocket live updates | `hooks/useWebSocket.ts`, `lib/websocket-client.ts` | Server-side WebSocket emitter not built; Redis pub-sub not connected |
| Sidebar collapse | `stores/ui-store.ts` (`sidebarCollapsed`) | Toggle button not rendered; sidebar width is fixed |
| Active view tracking | `stores/ui-store.ts` (`activeView`) | Not consumed by any component |
| NLQ AI backend | `hooks/useNlq.ts` | Points to `localhost:8001` which does not exist; hook is unused |
| Regulations filter | `AuditLogFilters` dropdown | Dropdown renders but value is not passed to the API |
| Time period filter | Governance Dashboard dropdown | Renders but does not filter any data |
| Export button (Dashboard) | Governance Dashboard header | Renders but has no handler |
| Board Report button (Dashboard) | Governance Dashboard header | Renders but has no navigation handler |
| Export Event button | `AuditLogDrawer` footer | Renders but has no handler |

---

## Placeholder pages — UI shell only

| Page | Route | What needs to be built |
|---|---|---|
| Board Report Builder | `/board-reports` | Report wizard, data aggregation, PDF generation, audit certificate |
| AI Agent Monitor | `/ai-agents` | Per-agent metrics, confidence trends, override rates, recommendation history |
| Data Flow Visualizer | `/data-flow` | Visual diagram of AI decision flow through the system (disabled in nav) |
| Model Registry | `/model-registry` | Full CRUD for AI model registrations (disabled in nav) |
| Incident Timeline | `/incidents` | Chronological incident log with severity tracking (disabled in nav) |
| Access Controls | `/access-controls` | RBAC management — users, roles, permissions (disabled in nav) |

---

## Planned but not started

### High priority

**Real-time alert stream**  
Replace the 30-second poll on `useAlerts` with a WebSocket connection. Redis pub-sub is already running (`aitc_redis`). The Go API would need a WebSocket handler that publishes new `blocked`/`flagged` events as they arrive.

**Policy rule evaluation**  
Policies currently exist only as stored configuration — they are not evaluated against incoming audit events. A policy evaluation engine would check each event against enabled policies at ingestion time and populate `policy_violations` accordingly.

**Authentication**  
Currently there is no auth layer. All requests use the seed tenant ID. See `Documentation/Security.md` for the full gap analysis.

### Medium priority

**Board Report Builder**  
Step-by-step wizard to generate a PDF compliance report covering a selected period, with a cryptographic audit certificate (hash of report content + signing timestamp).

**AI Agent Monitor**  
Per-agent confidence score trends, override rates, and recommendation history. Would require either a dedicated `agents` table or aggregating `agent_id` groupings from `audit_events`.

**NLQ upgrade to real AI**  
Replace the regex keyword parser (`parseNlq.ts`) with a call to Claude that converts natural language to a structured `AuditLogFilters` object. The `useNlq.ts` hook scaffolds the mutation; the missing piece is a Next.js route handler that calls Claude and returns filters.

### Lower priority

**ClickHouse analytics integration**  
ClickHouse is running (`aitc_clickhouse`) but nothing writes to it. For analytics-scale queries (e.g. million-row audit log aggregations, complex time-series analysis) the Go API would need a separate ClickHouse repository layer.

**Regulations filter**  
Wire the existing "All Regulations" dropdown in the audit log filter bar to the API. Would require adding a `regulation` column or tag to `audit_events`, or mapping policy violation names to regulation labels.

**Sidebar collapse**  
The `useUiStore` already has `sidebarCollapsed` and `toggleSidebar`. The sidebar needs a collapse toggle button and responsive width handling.

---

## Known limitations (current prototype)

| Limitation | Impact |
|---|---|
| No authentication | Anyone with the URL can access all data; tenant ID is hardcoded |
| Client-side sorting only | Sorting operates on the current page only, not the full result set |
| Export cap at 5000 rows | `page_size=5000` is passed but the Go API clamps `page_size` to 200 in the current handler — exports may be incomplete for large datasets |
| NLQ first-match-wins | Multiple outcome/type keywords in one query only apply the first match |
| Hardcoded values | "AI Decisions Today" (62,847), "Compliance Coverage" (100%), "decisions_today" in summarise payload are static strings |
| SIEM push is simulated | No real syslog/SIEM endpoint — the push confirmation is UI-only |
| Alert acknowledgement is in-memory | Refreshing the page resets acknowledged state |
| Policy rules not evaluated | `rule_config` is stored but never executed against events |
