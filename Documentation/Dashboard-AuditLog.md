# Audit Log Explorer

**Route:** `/audit-log`  
**File:** `apps/web/src/app/(dashboard)/audit-log/page.tsx`

The Audit Log Explorer is the primary investigative tool. It provides a filterable, paginated, and sortable view of every AI decision recorded in the system, with per-event drill-down including session context and AI-powered causal analysis.

---

## Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Page Header — "Audit Log Explorer" + export buttons          │
├─────────────────────────────────────────────────────────────┤
│ Filter bar (search, module, action, regulations, clear)      │
├─────────────────────────────────────────────────────────────┤
│ Audit event table (sortable columns, paginated)              │
├─────────────────────────────────────────────────────────────┤
│ Pagination footer (Page N of N, Prev / Next)                 │
└─────────────────────────────────────────────────────────────┘
```

A right-side drawer (`AuditLogDrawer`) overlays the page when a row is clicked.  
A centred modal (`SiemModal`) overlays the page when SIEM Push is triggered.

---

## Header export buttons

| Button | Colour | Behaviour |
|---|---|---|
| Export CSV | White/border | Fetches up to 5000 filtered events → downloads `.csv` |
| Export JSON | White/border | Fetches up to 5000 filtered events → downloads `.json` |
| SIEM Push | Blue `#2563EB` | Fetches up to 5000 filtered events → opens `SiemModal` with CEF preview |

All three buttons show an inline spinner while loading and are disabled during the request.

See `Documentation/API-InternalNextJS.md` for the full export implementation.

---

## Filter bar

Component: `AuditLogFilters`

| Control | Maps to | API param |
|---|---|---|
| Search input (free text) | `filters.search` | `search` (ILIKE on `action`, `agent_id`, `session_id`) |
| Module dropdown | `filters.outcome` | `outcome` — options labelled as module names but map to outcome values (`Autopilot` → `allowed`, `Copilot` → `flagged`, `Mpower Agent` → `blocked`) |
| Action dropdown | `filters.eventType` | `event_type` |
| Regulations dropdown | UI only | not wired to API |
| Model ID (URL param) | `filters.modelId` | `model_id` — populated from `?model_id=` on load; enables deep-link from Model Registry detail drawer |
| Clear button | Resets search, outcome, eventType, startDate, endDate | — |

The filter bar also shows a result count: `"Showing N of X events"` using `totalCount` passed down from the page.

Any filter change resets `page` to 1.

---

## Event table

Component: `AuditLogTable`  
Data source: `useAuditLog(filters)` → `GET /api/v1/audit-log`  
Page size: 50 (default)

### Sortable columns

All columns are sortable via the `useSortable` hook (client-side sort of the current page). Clicking a column header toggles ascending/descending; active column is highlighted blue.

| Column | Field | Notes |
|---|---|---|
| Event ID | `id` | First 8 chars, uppercased, monospace |
| Timestamp | `event_time` | `yyyy-MM-dd HH:mm:ss` format |
| Module | `event_type` | Plain text |
| Model Version | `model_name` | Monospace |
| Session / Agent | `session_id` / `agent_id` | Two-line cell; first 12/8 chars of each |
| Confidence | `confidence_score` | Shown as `XX.X%` |
| Action | `outcome` | Colour-coded badge |
| Regulations | `policy_violations` | Blue pills per violation; `—` if none |

The **Show Details** button in each row opens the `AuditLogDrawer`.

### Loading and empty states

- Loading: 8 `LoadingSkeleton` rows of height 40px
- No results: centred message "No events match the current filters"
- API error: red banner "Failed to load audit events — is the API running?"

### Pagination

Displayed below the table: `Page N of N` on the left, Prev/Next buttons on the right. Prev is disabled on page 1; Next is disabled on the last page.

---

## Audit Event Drawer

Component: `AuditLogDrawer`  
Width: 520px, slides in from the right  
Triggered by: "Show Details" button in the table row

### Sections

**Outcome callout**  
Colour-coded banner (red = blocked, amber = flagged, green = allowed) showing the outcome badge, event type, and formatted timestamp.

**Detail rows**  
Label/value pairs in a bordered box:
- Event ID (full UUID, monospace)
- Timestamp
- Module (event type)
- Model Version
- Session ID (full, break-all)
- Agent ID (full, break-all)
- Confidence (coloured: green ≥85%, amber ≥70%, red <70%)
- Action

**Policy Violations**  
Red pill badges for each violation. Section hidden if none.

**Session Timeline**  
Fetches up to 20 events from the same session via `useAuditLog({ search: session_id })`. Displayed as a chronological list with outcome dot, time, event type, outcome badge, and confidence. The current event is highlighted with a blue background and a `THIS EVENT` label.

**Causal Analysis**  
An "Explain with AI" purple button triggers `POST /api/explain-event`, sending the full event detail and session timeline to Claude Sonnet 4.6. The response is rendered as plain text paragraphs. The button is replaced by the explanation once received; errors are shown inline.

**Metadata**  
If `event.metadata` is non-empty, displayed as a formatted JSON `<pre>` block.

**Footer buttons**  
- Close
- Export Event — calls `exportSingleEventCSV(event)` from `lib/exportAuditLog.ts`; downloads a one-row CSV for this specific event without any additional API call

Closing: backdrop click, Escape key, or Close button.

---

## SIEM Push Modal

Component: `SiemModal`  
Width: 680px, centred overlay  
Triggered by: SIEM Push button in the page header

`SiemModal` owns the SIEM integration configuration state (`SiemConfig`) and passes it to both the display and to `SiemConfigModal`.

### Layout

**Header** — "SIEM Push Preview" title with format and event count subtitle. Gear icon (⚙) button opens the configuration modal.

**Integration summary strip** — a compact bar below the header showing:
- Status dot (green = enabled, gray = disabled)
- Integration name
- Resolved endpoint host:port
- Destination index
- "Configure →" inline link (also opens the config modal)

**Payload preview** — formatted CEF or JSON preview of the first 5 events from the fetched batch.

**Warning banner** — shown when the integration is disabled, prompting the user to enable it in Configuration before pushing.

**Success banner** — shown after push, references the configured endpoint: `✓ N events pushed to hostname:port`.

**Footer** — shows batch size and sourcetype from config; Cancel button; "Push N Events" button (disabled when integration is disabled or already pushed).

Closing: backdrop click, Escape key (when config modal is not open), or Cancel button.

---

## SIEM Configuration Modal

Component: `SiemConfigModal`  
File: `apps/web/src/components/audit-log/SiemConfigModal.tsx`  
Width: 620px, centred overlay at z-60 (above SiemModal)  
Triggered by: gear icon in SiemModal header, or "Configure →" link in integration strip

Pre-populated with a Splunk HTTP Event Collector (HEC) demo configuration. All fields are editable. Changes take effect immediately in `SiemModal` on save (held in React state — not persisted to the server).

### Configuration fields

| Section | Field | Type | Default |
|---|---|---|---|
| Status | Integration Status | Toggle | Enabled |
| Integration Details | Integration Name | Text | `NICE AI Trust Center → Splunk` |
| Endpoint | HEC Endpoint URL | Text | `https://splunk.internal:8088/services/collector/event` |
| Endpoint | HEC Token | Password (show/hide) | demo UUID |
| Endpoint | Verify SSL Certificate | Toggle | On |
| Data Settings | Index | Text | `ai_governance` |
| Data Settings | Source | Text | `nice-ai-trust-center` |
| Data Settings | Sourcetype | Text | `_json` |
| Data Settings | Event Format | Select: CEF / JSON | `CEF` |
| Data Settings | Batch Size | Number (1–5000) | `500` |

**Disabled integration warning** — if SSL Verify is off, an amber "Not recommended in production" badge appears inline.

**Connection test note** — a blue info banner prompts the user to use the SIEM Push button to verify connectivity after saving.

**Save** — clicking "Save Configuration" shows a brief `✓ Saved` confirmation then closes the modal. The updated config is reflected immediately in `SiemModal`'s integration strip and footer metadata.

---

## Data dependencies

| Hook / utility | API endpoint | Used by |
|---|---|---|
| `useAuditLog(filters)` | `GET /api/v1/audit-log` | Main table |
| `useAuditLog({ search: session_id })` | `GET /api/v1/audit-log` | Session timeline in drawer (two separate calls) |
| `exportCSV` / `exportJSON` | `GET /api/v1/audit-log?page_size=5000` | Export buttons |
| `apiGet` (inline in SIEM handler) | `GET /api/v1/audit-log?page_size=5000` | SIEM Push button |
| `POST /api/explain-event` | Next.js route → Claude | Explain with AI in drawer |
