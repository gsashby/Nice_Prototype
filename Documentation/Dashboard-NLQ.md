# Natural Language Query

**Route:** `/nlq`  
**File:** `apps/web/src/app/(dashboard)/nlq/page.tsx`

The Natural Language Query page allows users to ask plain-English questions about audit data and see the matching events in a sortable, drillable table. See `Documentation/NLQ.md` for a deep dive into the query parsing logic.

---

## Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Page Header — "Natural Language Query"                       │
├─────────────────────────────────────────────────────────────┤
│ NlqInput — search box + Query button                         │
├─────────────────────────────────────────────────────────────┤
│ NlqSuggestions — suggested query chips (hidden after query)  │
├─────────────────────────────────────────────────────────────┤
│ NlqResultTable — sortable event table + interpreted tags     │
└─────────────────────────────────────────────────────────────┘
```

---

## Query Input

Component: `NlqInput`

A full-width text input with a search icon on the left and a blue **Query** button on the right. Submits on form submit (Enter key or button click). The input value is controlled by the parent page so it can be cleared when the user hits Clear.

---

## Suggested Queries

Component: `NlqSuggestions`

Shown only when no query has been run yet (i.e. `result === null`). Displays five hardcoded suggestion chips:

- Show me all blocked events
- Show flagged policy violations this week
- Show all inference events
- Show bias scan events last 30 days
- Show allowed events today

Clicking a chip runs the query immediately (same as typing and submitting).

---

## Result Table

Component: `NlqResultTable`  
Data source: `useAuditLog(result.filters)` → `GET /api/v1/audit-log`

### Header

Shows:
- "Query Results" title
- Total matched event count: `"N events matched — click any row for full detail"`
- Interpreted-as tags (blue pills) — e.g. `outcome: blocked`, `period: last 7 days` — showing what was parsed from the query
- **Clear** button — resets the result and clears the input field

### Table columns

All columns are sortable via `useSortable` (client-side sort of the current page).

| Column | Field | Notes |
|---|---|---|
| Event ID | `id` | First 8 chars, uppercased, monospace |
| Timestamp | `event_time` | `yyyy-MM-dd HH:mm:ss` format |
| Module | `event_type` | Plain text |
| Model | `model_name` | Monospace |
| Confidence | `confidence_score` | Shown as `XX.X%` |
| Outcome | `outcome` | Colour-coded badge |
| Policy Violations | `policy_violations` | Blue pills; `—` if none |

### Row drill-down

Clicking any row opens the `AuditLogDrawer` — the full event detail panel including session timeline and Explain with AI. Same drawer used in the Audit Log Explorer.

### Empty and error states

- Loading: 6 `LoadingSkeleton` rows of height 40px
- No matches: `"No events matched your query"`
- API error: `"Failed to load results — is the API running?"`
- No query yet: `EmptyState` component — `"Run a query above to see results"`

---

## Page state

The page holds two pieces of state:

| State | Type | Description |
|---|---|---|
| `query` | `string` | The current input value — passed down to `NlqInput` so Clear can reset it |
| `result` | `NlqResult \| null` | The parsed filter set + tags — passed to `NlqResultTable`; `null` before first query or after Clear |

Submitting a new query calls `parseNlq(query)` synchronously (no network call) and sets `result`, which causes `NlqResultTable` to fetch from the API with the derived filters.

---

## Data dependencies

| Hook / function | API endpoint | Used by |
|---|---|---|
| `parseNlq(query)` | None — pure function | Page, on form submit |
| `useAuditLog(result.filters)` | `GET /api/v1/audit-log` | Result table |
