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
| `apiPatch<T>(path, body)` | `PATCH` | Toggling policy enabled state |

All three are `async`, return `Promise<T>`, and throw an `Error` with the response status text on failure.

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

### `usePolicies()` / `useTogglePolicy()`

**File:** `apps/web/src/hooks/usePolicies.ts`  
**Calls:**
- `GET /api/v1/policies` (list)
- `PATCH /api/v1/policies/:id/toggle` (toggle)

`useTogglePolicy` is a `useMutation` that calls `apiPatch` and then invalidates the `['policies']` query key to trigger a refetch.

```ts
const toggle = useTogglePolicy();
toggle.mutate({ id: policy.id, enabled: !policy.enabled });
```

---

## Export utility — `exportAuditLog.ts`

**File:** `apps/web/src/lib/exportAuditLog.ts`

Handles client-side data export. All three export functions call `GET /api/v1/audit-log` directly with `page=1&page_size=5000`, respecting the currently active filters.

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
  search?: string;
}
```

When passed to `apiGet`, the hook or utility converts these to snake_case query params (`page_size`, `start_date`, `end_date`, `event_type`) to match the Go API.
