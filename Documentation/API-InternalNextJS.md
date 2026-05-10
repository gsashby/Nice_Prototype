# Internal Next.js API Client

The frontend communicates with the Go REST API through a thin client module at `apps/web/src/lib/api-client.ts`. All data fetching, TanStack Query hooks, and export utilities go through this module.

---

## `api-client.ts`

Provides typed wrappers around `fetch` that prepend `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:8080`) and throw on non-OK responses.

### Exported helpers

| Function | Method | Usage |
|---|---|---|
| `apiGet<T>(path)` | `GET` | Data fetching in hooks and SIEM push handler |
| `apiPost<T>(path, body)` | `POST` | Creating policies |
| `apiPut<T>(path, body)` | `PUT` | Updating policies |
| `apiPatch<T>(path, body)` | `PATCH` | Toggling policy enabled state |
| `apiDelete(path)` | `DELETE` | Deleting policies |

All are `async`, return `Promise<T>`, and throw an `Error` with the response status text on failure. `apiDelete` returns `Promise<void>`.

---

## TanStack Query hooks

Each hook wraps a specific API endpoint with TanStack Query v5, providing caching, background refetch, and loading/error states.

### `useAuditLog(filters: AuditLogFilters)`

**File:** `apps/web/src/hooks/useAuditLog.ts`  
**Calls:** `GET /api/v1/audit-log`

Used by:
- `AuditLogTable` (Audit Log Explorer)
- `NlqResultTable` (NLQ results)
- `AuditLogDrawer` (session timeline — filters by `search: session_id`)
- `IncidentTimeline` (Incident Timeline — filters by `outcome: blocked` or `flagged`)
- `SummaryKpis` in `incidents/page.tsx` (two calls at `pageSize: 1` to get blocked/flagged totals)
- `AlertDrawer` mini-list (filters by `outcome` matching severity)

```ts
const { data, isLoading, isError } = useAuditLog(filters);
// data: { events: AuditEvent[], total: number, page: number, page_size: number }
```

Query key includes all filter values, so any filter change triggers a new fetch. `staleTime` uses the TanStack Query default (0 — always refetch on mount).

### `useGovernanceMetrics()`

**File:** `apps/web/src/hooks/useGovernanceMetrics.ts`  
**Calls:** `GET /api/v1/governance/metrics`

Used by the Governance Dashboard KPI cards and the chart. Refetches every 30 seconds via `refetchInterval`.

### `useModelHealth()`

**File:** `apps/web/src/hooks/useModelHealth.ts`  
**Calls:** `GET /api/v1/governance/models`

Used by `ModelHealthTable`. Refetches every 30 seconds.

### `useAlerts()`

**File:** `apps/web/src/hooks/useAlerts.ts`  
**Calls:** `GET /api/v1/governance/alerts`

Used by `AlertFeed`. Refetches every 30 seconds.

### `useModelRegistry()` / `useRegisterModel()`

**File:** `apps/web/src/hooks/useModelRegistry.ts`  
**Calls:**
- `GET /api/v1/governance/models` (list)
- `POST /api/v1/models` (register)

`useModelRegistry` unwraps the `{ models }` envelope and returns the array directly. It shares the `['governance', 'models']` query key with `useModelHealth` — both call the same endpoint, so TanStack Query deduplicates the network request and shares the cache.

`useRegisterModel` is a `useMutation` that calls `apiPost` and then invalidates the `['governance', 'models']` key to trigger a table refresh.

```ts
const models = useModelRegistry(); // data: RegistryModel[] | undefined
const register = useRegisterModel();
register.mutate({ name: 'GPT-4o', type: 'llm', version: '1.0', status: 'active' });
```

Refetch interval: 60 seconds.

### `usePolicies()` / `useTogglePolicy()` / `useCreatePolicy()` / `useUpdatePolicy()` / `useDeletePolicy()`

**File:** `apps/web/src/hooks/usePolicies.ts`  
**Calls:**
- `GET /api/v1/policies` (list)
- `POST /api/v1/policies` (create)
- `PUT /api/v1/policies/:id` (update)
- `DELETE /api/v1/policies/:id` (delete)
- `PATCH /api/v1/policies/:id/toggle` (toggle enabled state)

All mutations invalidate the `['policies']` TanStack Query cache on success, triggering an automatic list refetch.

```ts
const toggle = useTogglePolicy();
toggle.mutate({ id: policy.id, enabled: !policy.enabled });

const create = useCreatePolicy();
create.mutate({ name, description, severity, enabled: true, ruleConfig });

const update = useUpdatePolicy();
update.mutate({ id, name, description, severity, enabled, ruleConfig });

const del = useDeletePolicy();
del.mutate(policy.id);
```

The `api-client.ts` module also exports `apiPut<T>` and `apiDelete` helpers used by `useUpdatePolicy` and `useDeletePolicy` respectively.

---

## Export utility — `exportAuditLog.ts`

**File:** `apps/web/src/lib/exportAuditLog.ts`

Handles client-side data export. All three export functions call `GET /api/v1/audit-log` directly with `page=1&page_size=5000`, respecting the currently active filters.

### `exportSingleEventCSV(event)`

Exports a single `AuditEvent` as a one-row CSV file without any API call. Uses the same header row and `eventToRow` formatter as the bulk export.

- Filename format: `audit-event-{event.id}-{timestamp}.csv`
- Triggered by the **Export Event** button in `AuditLogDrawer`

### `exportCSV(filters)`

1. Fetches up to 5000 events via `fetchAll(filters)`.
2. Maps each event to a CSV row using `escapeCSV` (handles commas, quotes, newlines per RFC 4180).
3. Prepends a header row.
4. Triggers a browser download via `URL.createObjectURL` with MIME type `text/csv`.
5. Filename format: `audit-log-YYYY-MM-DDTHH-mm-ss.csv`

**CSV columns:** Event ID, Timestamp, Event Type, Model, Agent ID, Session ID, Action, Outcome, Confidence (%), Policy Violations

### `exportJSON(filters)`

1. Fetches up to 5000 events.
2. Wraps events in a metadata envelope.
3. Triggers download with MIME type `application/json`.
4. Filename format: `audit-log-YYYY-MM-DDTHH-mm-ss.json`

**JSON envelope:**
```json
{
  "exported_at": "2025-05-09T14:22:00.000Z",
  "total": 847,
  "filters": {
    "outcome": "blocked",
    "event_type": null,
    "search": null,
    "start_date": "2025-05-02T00:00:00Z",
    "end_date": null
  },
  "events": [ ... ]
}
```

### `buildSiemPayload(events)`

Pure function — no network call. Takes the first 5 events and formats them as **CEF (Common Event Format)** strings for SIEM ingestion.

**CEF field mapping:**

| CEF field | Source |
|---|---|
| `DeviceVendor` | `NICE CXone` (hardcoded) |
| `DeviceProduct` | `AI Trust Center` (hardcoded) |
| `DeviceVersion` | `1.0` (hardcoded) |
| `SignatureID` | `event.outcome.toUpperCase()` |
| `Name` | `event.event_type` |
| `Severity` | `8` (blocked), `5` (flagged), `2` (allowed) |
| `rt` | `event_time` as Unix milliseconds |
| `suser` | `agent_id` |
| `dvc` | `model_name` |
| `cs1` / `cs1Label` | `session_id` / `sessionId` |
| `cs2` / `cs2Label` | `confidence_score` as `%` / `confidence` |
| `cs3` / `cs3Label` | `policy_violations` joined with `;` / `policyViolations` |

Example output line:
```
CEF:0|NICE CXone|AI Trust Center|1.0|BLOCKED|inference|8|rt=1746800520000 suser=agent-abc123 dvc=GPT-4o Autopilot cs1=sess-xyz789 cs1Label=sessionId cs2=41.2% cs2Label=confidence cs3=bias-threshold;pii-detected cs3Label=policyViolations
```

---

## Report certificate — `reportCertificate.ts`

**File:** `apps/web/src/lib/reportCertificate.ts`

Generates a tamper-evident audit certificate for Board Reports using the **Web Crypto API** (`crypto.subtle.digest`). Called client-side — no server round-trip.

```ts
type Certificate = {
  id: string;        // "AITC-{base36 timestamp}-{first 8 hex chars of SHA-256}"
  hash: string;      // full SHA-256 hex of JSON.stringify(payload)
  issuedAt: string;  // ISO 8601
  expiresAt: string; // issuedAt + 1 year
}

async function generateCertificate(payload: object): Promise<Certificate>
```

The hash covers the full report payload (config, metrics, audit stats, generation timestamp). Any post-generation modification to the report data would produce a different hash, making tampering detectable.

---

## Next.js route handlers (server-side AI)

All route handlers call the Anthropic SDK server-side. The `ANTHROPIC_API_KEY` never reaches the browser.

### `POST /api/summarize`

**File:** `apps/web/src/app/api/summarize/route.ts`  
Used by: Governance Dashboard "Summarize with AI" button  
**Model:** `claude-sonnet-4-6`, 600 max tokens  
**Input:** `{ governance_score, decisions_today, policy_violations, compliance_coverage, alerts, models }`  
**Output:** `{ summary: string }` — plain-text executive summary

### `POST /api/recommend-action`

**File:** `apps/web/src/app/api/recommend-action/route.ts`  
Used by: `RecommendationDrawer` — "Get AI Analysis" button  
**Model:** `claude-sonnet-4-6`, 600 max tokens  
**Input:** `{ recommendation: Recommendation, dashboardContext: { governance_score, policy_violations_24h, alertCount } }`  
**Output:** `{ analysis: string }` — narrative governance analysis of the selected recommendation

Only called on explicit user request — not on drawer open. The route requests JSON output from Claude; on parse failure the raw response text is returned as `analysis`.

### `POST /api/explain-event`

**File:** `apps/web/src/app/api/explain-event/route.ts`  
Used by: Audit Log drawer "Explain with AI" button  
**Model:** `claude-sonnet-4-6`, 600 max tokens  
**Input:** `{ event: AuditEvent, sessionEvents: AuditEvent[] }`  
**Output:** `{ explanation: string }` — causal chain analysis of a single audit event

### `POST /api/report-summaries`

**File:** `apps/web/src/app/api/report-summaries/route.ts`  
Used by: Board Report Builder (Step 2, on mount)  
**Model:** `claude-sonnet-4-6`, 800 max tokens  
**Input:** `{ reportContext }` — full report data (title, period, governance score, counts, models, policies, alerts)  
**Output:** `{ summaries: { executive, compliance, performance, risk } }` — four plain-prose section summaries  
Returns 500 JSON on Claude error; silently skipped by the UI.

### `POST /api/nlq`

**File:** `apps/web/src/app/api/nlq/route.ts`  
Used by: `NlqPanel` — AI fallback path when the regex parser finds no structured filters  
**Model:** `claude-sonnet-4-6`, 256 max tokens  
**Input:** `{ query: string }`  
**Output:** `{ filters: AuditLogFilters, tags: string[], source: 'ai' }`

Uses Claude tool use with `tool_choice: { type: 'tool', name: 'set_filters' }` — this forces a structured JSON response every time, eliminating hallucinated field names. The tool schema matches `AuditLogFilters` exactly (outcome enum, eventType enum, startDate, endDate, search). Today's date is injected into the prompt so Claude can resolve relative time references ("yesterday", "last week") to ISO 8601 strings.

Only called when `parseNlq()` returns nothing but the raw `search:` fallback — the regex fast path handles all recognisable keywords without any network call.

---

### `POST /api/report-addition`

**File:** `apps/web/src/app/api/report-addition/route.ts`  
Used by: Board Report Builder AI assistant input  
**Model:** `claude-sonnet-4-6`, 600 max tokens  
**Input:** `{ request: string, reportContext }` — user's free-text request + report data  
**Output:** `{ outOfScope: false, content: string }` or `{ outOfScope: true, reason: string }`

Includes a topic guard: Claude rejects requests unrelated to AI governance, compliance, model performance, policy enforcement, auditing, or regulatory compliance.

---

## Filter type reference

`AuditLogFilters` (defined in `apps/web/src/types/audit.ts`) is the shared filter shape used by hooks, the NLQ parser, and the export utility:

```ts
type AuditLogFilters = {
  page: number;
  pageSize: number;
  startDate?: string;   // ISO 8601
  endDate?: string;     // ISO 8601
  eventType?: string;
  outcome?: string;
  modelId?: string;     // filters by model — forwarded as model_id query param
  search?: string;
}
```

When passed to `apiGet`, the hook or utility converts these to snake_case query params (`page_size`, `start_date`, `end_date`, `event_type`, `model_id`) to match the Go API.
