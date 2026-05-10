# Feature Roadmap

Current state as of May 2026. Covers what is built, what is scaffolded but incomplete, and what is planned.

---

## Built and working

| Feature | Page | Notes |
|---|---|---|
| Governance Dashboard | `/` | KPI cards, 6-week trend chart, alert feed, module health table |
| Alert investigation drawer | `/` | Right-side drawer with severity callout, related audit events, Acknowledge/Escalate/Dismiss |
| Summarize with AI | `/` | Claude Sonnet 4.6 executive summary of live dashboard data |
| Audit Log Explorer | `/audit-log` | Filterable, paginated, sortable event table; deep-link from Model Registry |
| Audit event detail drawer | `/audit-log` | Full event detail, session timeline, policy violations |
| Explain with AI (causal analysis) | `/audit-log` | Claude Sonnet 4.6 explanation of a specific event + session context |
| Audit log export — CSV (filtered) | `/audit-log` | Downloads up to 5000 filtered events |
| Audit log export — JSON (filtered) | `/audit-log` | Downloads with metadata envelope |
| Audit log export — single event CSV | `/audit-log` | Export Event button in detail drawer downloads one-row CSV |
| SIEM Push preview | `/audit-log` | CEF/JSON format modal, simulated push confirmation; integration summary strip |
| SIEM Integration Configuration | `/audit-log` | Splunk HEC config form (endpoint URL, HEC token with show/hide, index, source, sourcetype, format, batch size, SSL verify, enabled toggle); accessible via gear icon or "Configure →" link in the SIEM Push modal; config held in React state and reflected immediately |
| Policy Engine — list | `/policy-engine` | Sortable table of all policies with violation counts and inline rule summary |
| Policy Engine — toggle | `/policy-engine` | Enable/disable individual policies via API |
| Policy Engine — create | `/policy-engine` | PolicyBuilder form with structured rule editor: field → operator → value → action; produces `rule_config` JSON |
| Policy Engine — edit | `/policy-engine` | Pencil icon opens PolicyBuilder pre-filled with existing policy and rule condition |
| Policy Engine — delete | `/policy-engine` | Trash icon with inline confirmation (Delete? Yes / Cancel); calls `DELETE /api/v1/policies/:id` |
| Policy Engine — page description | `/policy-engine` | Full-width description card with 4 feature tiles (enforcement, severity, enable/disable, violation tracking) |
| Board Report Builder | `/board-reports` | 2-step wizard: configure period/scope → preview report with AI summaries |
| Board Report — AI section summaries | `/board-reports` | Claude auto-generates executive, compliance, performance, and risk prose on Step 2 load |
| Board Report — AI assistant | `/board-reports` | Free-text prompt adds custom governed content to the report; topic guard rejects off-scope requests |
| Board Report — audit certificate | `/board-reports` | SHA-256 hash of report payload, certificate ID, 1-year validity |
| Board Report — print to PDF | `/board-reports` | Browser print dialog via `window.print()` with print-media CSS |
| Model Registry | `/model-registry` | Searchable, sortable model table (name, type, version, status, gov score bar, avg confidence, inferences, violations); filter bar for type and status; 5 summary KPI cards (total, active, avg gov score, critical, inferences 7d) |
| Model Registry — detail drawer | `/model-registry` | Governance score gauge with health label; metric cards for avg confidence, total inferences, violations, and bias score; bias health callout; model detail rows (type, version, registered, last updated) |
| Model Registry — register model | `/model-registry` | 4-field inline form (name, version, type, initial status); POSTs to `POST /api/v1/models` with graceful fallback if endpoint not yet implemented |
| Audit log model filter | `/audit-log` | `model_id` param wired end-to-end: `useAuditLog` passes it to the API; page reads `?model_id=` from the URL on load; deep-link from Model Registry detail drawer |
| Sidebar collapse | All pages | Toggle button at bottom of sidebar; width transitions from 216px to 52px; labels, badges, and section headers fade out; icons remain centred; `title` tooltips on hover when collapsed; state persisted in `useUiStore` |
| Board Report button | `/` | "Board Report" button in Governance Dashboard header navigates to `/board-reports` |
| Data Flow Visualizer | `/data-flow` | Animated SVG pipeline diagram with node selection and governance KPIs |
| Natural Language Query | `/` | Embedded at top of Governance Dashboard; always-visible input + suggested query chips; results card appears after submit and is collapsible; row drill-down opens `AuditLogDrawer` |
| NLQ hybrid AI interpretation | `/` | Regex fast path (<1 ms) for known keywords; Claude Sonnet 4.6 fallback via `POST /api/nlq` when regex finds no structure; supports multi-condition queries and synonyms; graceful regex fallback on AI failure; ✨ AI badge shown in results header |
| Incident Timeline | `/incidents` | Chronological vertical timeline of blocked and flagged AI events; date-grouped with "Today"/"Yesterday" labels; severity-coded dots (critical/high/medium/low); incident cards show model, confidence, policy violations; Blocked/Flagged tabs; 4 KPI summary cards; Load More pagination; row click opens `AuditLogDrawer` |
| Agent Trust Panel | `/ai-agents` | Per-agent trust scores (allow rate 50% + avg confidence 35% + violation-free rate 15%); sortable table (trust bar, block rate, sessions, violations, last seen); time-period selector (7d/30d/all); 4 fleet KPI chips; detail drawer with trust gauge, outcome breakdown bar, top violations, recent sessions, "View All Events" deep-link |

---

## Scaffolded — code exists but not fully wired

| Feature | Location | What's missing |
|---|---|---|
| WebSocket live updates | `hooks/useWebSocket.ts`, `lib/websocket-client.ts` | Server-side WebSocket emitter not built; Redis pub-sub not connected |
| Active view tracking | `stores/ui-store.ts` (`activeView`) | Not consumed by any component |
| Regulations filter | `AuditLogFilters` dropdown | Dropdown renders but value is not passed to the API |
| Time period filter | Governance Dashboard dropdown | Renders but does not filter any data |
| Export button (Dashboard) | Governance Dashboard header | Renders but has no handler |

---

## Placeholder pages — UI shell only

| Page | Route | What needs to be built |
|---|---|---|
| Access Controls | `/access-controls` | RBAC management — users, roles, permissions (disabled in nav) |

---

## Planned but not started

Features are grouped into three priority tiers. Within each tier they are ordered by recommended build sequence.

---

### Priority 1 — High impact, low–medium effort

These close the most visible gaps in the prototype and are the best candidates for the next sprint.

---

**Regulatory Compliance Mapper**  
A dedicated view that maps each active policy to one or more regulatory frameworks (GDPR, ISO 42001, EU AI Act, SOC 2). Each framework would show which policies cover it, coverage percentage, and a gap list for uncovered requirements. The policy table already has severity and rule_config; the mapper only needs a static mapping table (policy → regulation tags) and a summary view. This is the most compelling feature to add for a governance demo because it turns a list of technical rules into a business-legible compliance posture.

*Effort: 1–2 days frontend + minor API change*

---

**Policy Simulation (dry-run mode)**  
A "Test Policy" button in the PolicyBuilder that sends the current rule_config to the API alongside a sample audit event payload and returns what outcome the engine would produce — block / flag / allow — without actually persisting anything. This makes it safe to experiment with new rules before enabling them. Requires a new `POST /api/v1/policies/simulate` endpoint in Go that evaluates rule_config against a submitted event.

*Effort: 2–3 days (Go endpoint + React UI)*

---

**Real-time Alert Toasts**  
Upgrade `useAlerts` from a 30-second poll to a WebSocket push. New `blocked` or `flagged` events would appear as a slide-in toast in the bottom-right corner with a link to open the audit event drawer. Redis pub-sub is already running (`aitc_redis`). Requires a Go WebSocket handler and a small React toast component. Adds genuine liveness to the dashboard.

*Effort: 2–3 days (Go WS handler + React toast)*

---

**Cost & Usage Tracking**  
A new KPI card (and optionally a sub-page) that shows estimated API cost per model, token usage breakdown, and inference volume by module (Autopilot / Copilot / Mpower Agent) over the last 7 and 30 days. Data can be approximated from `audit_events` (model_name + event_type = inference). This is a frequent ask in AI governance reviews.

*Effort: 1 day frontend (dashboard card) + 1 day API aggregation query*

---

### Priority 2 — Medium impact, medium effort

Meaningful additions that require more infrastructure or cross-cutting changes.

---

**Access Controls (RBAC)**  
The `/access-controls` page exists as a shell but is disabled in the nav. Build out user and role management: list users, assign roles (Admin / Analyst / Viewer), control which pages and actions each role can perform. Requires a `users` + `roles` table, a session/token concept, and middleware in Go to enforce permissions. This is the most credible path to a multi-user demo.

*Effort: 3–5 days end-to-end*

---

**Policy Approval Workflow**  
Add a "Pending Approval" state to policies. When a non-admin creates or edits a policy, it enters a draft state rather than becoming active immediately. An admin sees a badge on the Policy Engine nav item and an approval queue at the top of the policy list. Requires a `status` column on policies (`active`, `draft`, `pending`, `rejected`) and simple Go logic to transition states.

*Effort: 2–3 days*

---

**Saved Audit Log Filters**  
A "Save this filter" button in the Audit Log filter bar that persists the current filter combination (event type, outcome, date range, model) to localStorage or a user preferences table. Saved filters appear as chips below the filter bar for one-click restore. Useful in demos to quickly jump between scenarios.

*Effort: 1 day frontend (localStorage); 2 days if persisted to API*

---

**Policy Version History**  
Track every change to a policy (name, description, severity, rule_config, enabled) in an `audit_trail` or `policy_versions` table. A "History" icon in the policy list Actions column opens a drawer showing a chronological changelog with diffs. Requires a Go trigger or explicit versioning on every PUT.

*Effort: 2–3 days*

---

### Priority 3 — Lower priority / stretch goals

High-value but more complex, or dependent on Priority 1/2 features being in place first.

---

**Global Search (⌘K)**  
A command-palette overlay (keyboard shortcut ⌘K / Ctrl+K) that searches across policies, audit events, models, and agents simultaneously and navigates directly to results. Provides a fast, power-user experience and is highly demo-friendly.

*Effort: 2–3 days (UI only if backed by existing API endpoints)*

---

**Scheduled Board Reports**  
Extend the Board Report Builder with a scheduling step: choose frequency (weekly / monthly) and delivery method (download link / email). The Go API would need a cron job or a `pg_cron` task to generate the report and persist it. Combined with the audit certificate, this would make board-level compliance reporting fully automated.

*Effort: 3–5 days*

---

**Comparative Analytics**  
Side-by-side comparison of two time periods, two models, or two modules on the Governance Dashboard. Adds a "Compare" mode toggle that splits the trend chart and KPI cards into two columns. Requires no new API endpoints — only aggregation parameters already supported.

*Effort: 2 days frontend*

---

**Anomaly Detection**  
A background job that identifies unusual patterns in audit events (e.g. sudden spike in blocked events for a specific model, confidence score dropping below historical baseline) and surfaces them as high-priority alerts. Would use simple statistical thresholds rather than ML, making it buildable without an ML pipeline.

*Effort: 3–5 days (Go background job + alert integration)*

---

### Recommended execution order

| # | Feature | Priority | Est. effort | Reason |
|---|---|---|---|---|
| 1 | Regulatory Compliance Mapper | P1 | 1–2 days | Highest demo value; closes biggest narrative gap |
| 2 | Policy Simulation | P1 | 2–3 days | Makes the Policy Engine interactive and safe to demo |
| 3 | Real-time Alert Toasts | P1 | 2–3 days | Adds liveness; Redis already in place |
| 4 | Cost & Usage Tracking | P1 | 2 days | Frequently requested; uses existing data |
| 5 | Access Controls (RBAC) | P2 | 3–5 days | Required before multi-user scenarios |
| 6 | Saved Audit Filters | P2 | 1–2 days | Quick win; improves demo flow |
| 7 | Policy Approval Workflow | P2 | 2–3 days | Adds governance depth |
| 8 | Policy Version History | P2 | 2–3 days | Supports audit / change-control narrative |
| 9 | Global Search (⌘K) | P3 | 2–3 days | Polish; good for live walkthroughs |
| 10 | Comparative Analytics | P3 | 2 days | Lightweight but impactful visually |
| 11 | Scheduled Board Reports | P3 | 3–5 days | Requires cron infrastructure |
| 12 | Anomaly Detection | P3 | 3–5 days | Most complex; best left until core is stable |

---

### Infrastructure / foundation

**Policy rule evaluation**  
Policies store `rule_config` but this is never executed against incoming events. A policy evaluation engine in Go would check each new audit event against all enabled policies at ingestion time and populate `policy_violations`. This is a prerequisite for Policy Simulation (#2 above) and Anomaly Detection (#12).

**Real-time alert stream (WebSocket infrastructure)**  
The `hooks/useWebSocket.ts` and `lib/websocket-client.ts` stubs exist. Building the Go WebSocket handler and wiring Redis pub-sub is the enabler for Real-time Alert Toasts (#3 above).

**Authentication**  
Currently all requests use the seed tenant ID with no auth layer. A token/session system is a prerequisite for Access Controls (#5 above). See `Documentation/Security.md` for the full gap analysis.

**ClickHouse analytics integration**  
ClickHouse is running (`aitc_clickhouse`) but nothing writes to it. Required before analytics-scale queries (millions of rows, complex time-series) become practical. Not needed until the prototype outgrows PostgreSQL aggregation.

---

## Known limitations (current prototype)

| Limitation | Impact |
|---|---|
| No authentication | Anyone with the URL can access all data; tenant ID is hardcoded |
| Client-side sorting only | Sorting operates on the current page only, not the full result set |
| Export cap at 5000 rows | `page_size=5000` is passed but the Go API clamps `page_size` to 200 in the current handler — exports may be incomplete for large datasets |
| NLQ regex first-match-wins | In the regex path, multiple outcome/type keywords in one query only apply the first match; the AI fallback path resolves this for ambiguous queries |
| Hardcoded values | "AI Decisions Today" (62,847), "Compliance Coverage" (100%), "decisions_today" in summarise payload are static strings |
| SIEM push is simulated | No real syslog/SIEM endpoint — the push confirmation is UI-only |
| Alert acknowledgement is in-memory | Refreshing the page resets acknowledged state |
| Policy rules not evaluated | `rule_config` is stored and validated client-side but never executed against live events at ingestion time |
| Board Report PDF via browser print | No server-side PDF generation — layout is browser-dependent |
| Model Registry POST endpoint | `POST /api/v1/models` may not be implemented in the Go API; the mutation will fail until the handler exists |
