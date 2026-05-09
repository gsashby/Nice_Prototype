# Natural Language Query

**Location:** Embedded at the top of the Governance Dashboard (`/`)  
**Component:** `apps/web/src/components/nlq/NlqPanel.tsx`

The NLQ panel allows users to ask plain-English questions about audit data without leaving the Governance Dashboard. The standalone `/nlq` route has been removed — the full feature now lives in `NlqPanel`.

---

## Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Natural Language Query                                        │
│ "Ask questions about your governance data in plain English"  │
├─────────────────────────────────────────────────────────────┤
│ [🔍 Ask anything about your governance data…       Query ]  │
├─────────────────────────────────────────────────────────────┤
│ Suggested Queries                                            │
│ [Show me all blocked events] [Show flagged violations…] …   │
└─────────────────────────────────────────────────────────────┘

After a query is submitted:

┌─────────────────────────────────────────────────────────────┐
│ Query Results  [outcome: blocked] [period: last 7 days]  ▲  │
├─────────────────────────────────────────────────────────────┤
│  Sortable event table (collapses when header is clicked)     │
└─────────────────────────────────────────────────────────────┘
```

---

## Components

### `NlqPanel`

Top-level panel component. Owns all NLQ state:

| State | Type | Description |
|---|---|---|
| `query` | `string` | Current input value |
| `result` | `NlqResult \| null` | Parsed filters + tags; `null` before first query or after Clear |
| `resultsCollapsed` | `boolean` | Whether the results card body is hidden; resets to `false` on each new query |

Renders:
1. A white card with header, `NlqInput`, and `NlqSuggestions` — always visible
2. `NlqResultTable` (with collapse props) — appears only when `result !== null`

### `NlqInput`

Full-width text input with a search icon and blue **Query** button. Submits on Enter or button click.

### `NlqSuggestions`

Five hardcoded suggestion chips. Clicking one runs the query immediately:

- Show me all blocked events
- Show flagged policy violations this week
- Show all inference events
- Show bias scan events last 30 days
- Show allowed events today

### `NlqResultTable`

Data source: `useAuditLog(result.filters)` → `GET /api/v1/audit-log`

Accepts two additional props for embedded use:

| Prop | Type | Effect |
|---|---|---|
| `collapsed` | `boolean` | Hides the table body; header remains visible |
| `onToggleCollapsed` | `() => void` | Clicking the header row toggles collapse; chevron icon indicates state |

#### Header

- "Query Results" title
- Event count (hidden when collapsed)
- Interpreted-as tags (blue pills): e.g. `outcome: blocked`, `period: last 7 days`
- **Clear** button — resets result and clears input (stopPropagation prevents accidental collapse toggle)
- Chevron icon (▲ expanded / ▼ collapsed)

#### Table columns

All sortable client-side via `useSortable`:

| Column | Field | Format |
|---|---|---|
| Event ID | `id` | First 8 chars, uppercased, monospace |
| Timestamp | `event_time` | `yyyy-MM-dd HH:mm:ss` |
| Module | `event_type` | Plain text |
| Model | `model_name` | Monospace |
| Confidence | `confidence_score` | `XX.X%` |
| Outcome | `outcome` | Colour-coded badge |
| Policy Violations | `policy_violations` | Blue pills; `—` if none |

#### Row drill-down

Clicking any row opens `AuditLogDrawer` — full event detail with session timeline and Explain with AI.

#### States

| State | Display |
|---|---|
| Loading | 6 skeleton rows |
| No matches | `"No events matched your query"` |
| API error | `"Failed to load results — is the API running?"` |

---

## Query interpretation — hybrid approach

NLQ uses a two-stage hybrid: a synchronous regex parser runs first; Claude is only called when the regex fails to find any structured filters.

### Stage 1 — Regex parser (`lib/parseNlq.ts`)

Pure function, no network call, responds in <1 ms. Returns `source: 'regex'`.

Maps plain English to an `AuditLogFilters` object using regex matching (first-match-wins per category):

| Category | Keywords detected | Filter set |
|---|---|---|
| Outcome | `blocked` | `outcome: blocked` |
| Outcome | `flagged`, `violation`, `policy` | `outcome: flagged` |
| Outcome | `allowed`, `approved` | `outcome: allowed` |
| Event type | `inference` | `eventType: inference` |
| Event type | `policy check` | `eventType: policy_check` |
| Event type | `bias` | `eventType: bias_scan` |
| Event type | `session` | `eventType: session_start` |
| Event type | `model load` | `eventType: model_load` |
| Time | `today`, `last 24 hours` | `startDate`/`endDate` = today |
| Time | `last 7 days`, `this week`, `week` | `startDate` = 7 days ago |
| Time | `last 30 days`, `this month`, `month` | `startDate` = 30 days ago |
| Fallback | (no keywords matched) | `search: <raw query>` |

**Known limitation:** Multiple keywords from the same category in one query only apply the first match.

### Stage 2 — AI fallback (`POST /api/nlq` → Claude Sonnet 4.6)

Triggered only when the regex produced nothing but the raw search fallback (i.e. `tags = ['search: "..."]'`). Returns `source: 'ai'`.

The route calls Claude with tool use (`tool_choice: { type: 'tool', name: 'set_filters' }`), forcing a structured JSON response every time. Claude receives:
- The full set of valid outcomes and event types
- Today's date
- Instructions to apply multiple filters simultaneously and to only set fields clearly implied by the query

If the AI call fails for any reason (network error, API key missing, rate limit), `NlqPanel` silently falls back to the regex result so the feature never breaks entirely.

#### What AI unlocks vs. regex alone

| Query | Regex result | AI result |
|---|---|---|
| `"risky events this week"` | `search: "risky events this week"` | `outcome: blocked, period: last 7 days` |
| `"blocked inference events yesterday"` | `outcome: blocked` (drops type + time) | `outcome: blocked, type: inference, period: yesterday` |
| `"dangerous decisions last month"` | `search: "dangerous decisions last month"` | `outcome: blocked, period: last 30 days` |
| `"show me all blocked events"` | `outcome: blocked` ✓ fast path, no AI call | — |

### Source badge

When results are shown, a small badge in the "Query Results" header indicates how the query was interpreted:
- **✨ AI** (purple) — Claude interpreted the query
- No badge — regex matched directly (fast path)

---

## Data dependencies

| Hook / function | API endpoint | Used by |
|---|---|---|
| `parseNlq(query)` | None — pure function | `NlqPanel`, fast path |
| `POST /api/nlq` | Next.js route → Claude Sonnet 4.6 | `NlqPanel`, AI fallback path |
| `useAuditLog(result.filters)` | `GET /api/v1/audit-log` | `NlqResultTable` |
