# Natural Language Query

**Location:** Embedded at the top of the Governance Dashboard (`/`)  
**Component:** `apps/web/src/components/nlq/NlqPanel.tsx`

The NLQ panel allows users to ask plain-English questions about AI governance data without leaving the Governance Dashboard. The standalone `/nlq` route has been removed — the full feature lives in `NlqPanel`.

---

## Layout

```
┌─────────────────────────────────────────────────────────────┐
│ CXone Query Explorer                                         │
│ "Ask questions about your AI governance data…"              │
├─────────────────────────────────────────────────────────────┤
│ [🔍 Ask anything about your governance data…       Query ]  │
├─────────────────────────────────────────────────────────────┤
│ FILTER QUERIES                                               │
│ [Show blocked events today] [Show bias scan events…] …      │
│ AI GOVERNANCE QUESTIONS                                      │
│ [How many blocked events this week?] [Explain governance…]  │
└─────────────────────────────────────────────────────────────┘

After a filter query:

┌─────────────────────────────────────────────────────────────┐
│ Query Results  [outcome: blocked] [period: last 7 days]  ▲  │
├─────────────────────────────────────────────────────────────┤
│  (optional) ℹ Blue context banner for analytical queries    │
├─────────────────────────────────────────────────────────────┤
│  Sortable event table (collapses when header is clicked)    │
└─────────────────────────────────────────────────────────────┘

After a governance knowledge question:

┌─────────────────────────────────────────────────────────────┐
│ Governance Answer  ✨ AI  [topic: blocked] [topic: flagged] │
├─────────────────────────────────────────────────────────────┤
│  Plain-text answer from Claude (no table)                   │
└─────────────────────────────────────────────────────────────┘

After an off-topic query:

┌─────────────────────────────────────────────────────────────┐
│ ⚠ Outside governance scope                                  │
│   [rejection reason from Claude]              [Clear]       │
└─────────────────────────────────────────────────────────────┘
```

---

## Components

### `NlqPanel`

Top-level panel component. Owns all NLQ state:

| State | Type | Description |
|---|---|---|
| `query` | `string` | Current input value |
| `result` | `NlqResult \| null` | Parsed filters + tags + optional answer/context; `null` before first query or after Clear |
| `offTopicMessage` | `string \| null` | Rejection reason from Claude when query is outside governance scope |
| `resultsCollapsed` | `boolean` | Whether the results card body is hidden; resets to `false` on each new query |
| `aiLoading` | `boolean` | `true` while waiting for the AI response |

Renders:
1. A white card with header, `NlqInput`, and `NlqSuggestions` — always visible
2. Yellow off-topic warning card — appears when `offTopicMessage` is set
3. `NlqResultTable` (with collapse props) — appears only when `result !== null`

### `NlqInput`

Full-width text input with a search icon and blue **Query** button. Shows "Thinking…" with a spinner while `loading` is true. Submits on Enter or button click.

### `NlqSuggestions`

Two groups of suggestion chips:

**Filter Queries** (blue border, white background) — hit the regex fast path, no AI call:
- Show blocked events today
- Show flagged policy violations this week
- Show all inference events last 30 days
- Show bias scan events yesterday
- Show allowed events this month
- Show Autopilot model events
- Show session end events last 7 days
- Show auto-applied events last 90 days
- Show top 50 blocked events
- Show non-compliant events this quarter

**AI Governance Questions** (purple border, lavender background) — always call the AI:
- How many blocked events were there this week?
- Which model has the most policy violations?
- Why are bias scan events important for governance?
- What is the difference between blocked and flagged outcomes?
- Explain what a governance score measures
- What does the EU AI Act require for AI monitoring?
- How does bias detection work in CXone?
- Compare inference events vs policy check events

### `NlqResultTable`

Data source: `useAuditLog(result.filters)` → `GET /api/v1/audit-log`

Renders in one of two modes:

#### Text answer mode (`result.answer` is set)

Shows a "Governance Answer" card with:
- ✨ AI badge (purple)
- Topic tags as blue pills
- Clear button
- Claude's plain-text governance answer

No event table is shown.

#### Event table mode (`result.answer` is not set)

Accepts collapse props for embedded use:

| Prop | Type | Effect |
|---|---|---|
| `collapsed` | `boolean` | Hides the table body; header remains visible |
| `onToggleCollapsed` | `() => void` | Clicking the header row toggles collapse; chevron icon indicates state |

**Header**
- "Query Results" title and event count (hidden when collapsed)
- ✨ AI badge when `source === 'ai'`
- Interpreted-as tags (blue pills): e.g. `outcome: blocked`, `period: last 7 days`, `model: Autopilot`
- **Clear** button (stopPropagation prevents accidental collapse toggle)
- Chevron icon (▲ expanded / ▼ collapsed)

**Context banner** (optional, appears between header and table)

A blue info bar shown when `result.context` is set — used for analytical questions where Claude added an explanation of what the data shows.

**Table columns** — all sortable client-side via `useSortable`:

| Column | Field | Format |
|---|---|---|
| Event ID | `id` | First 8 chars, uppercased, monospace |
| Timestamp | `event_time` | `yyyy-MM-dd HH:mm:ss` |
| Module | `event_type` | Plain text |
| Model | `model_name` | Monospace |
| Confidence | `confidence_score` | `XX.X%` |
| Outcome | `outcome` | Colour-coded badge |
| Policy Violations | `policy_violations` | Blue pills; `—` if none |

**Row drill-down:** clicking any row opens `AuditLogDrawer` — full event detail with session timeline and Explain with AI.

**Loading states:**

| State | Display |
|---|---|
| Loading | 6 skeleton rows |
| No matches | `"No events matched your query"` |
| API error | `"Failed to load results — is the API running?"` |

---

## Query interpretation — hybrid approach

See `Documentation/NLQ.md` for the full technical specification. Summary:

1. `parseNlq()` runs synchronously — classifies query as `'filter'` or `'question'` and extracts structured filters via regex.
2. `shouldUseAI()` in `NlqPanel` returns `true` when: regex only produced a raw search term, OR `kind === 'question'`.
3. The AI route uses three tools: `set_filters` (data queries), `answer_question` (knowledge questions), `reject_query` (off-topic).
4. Off-topic queries get a yellow warning; knowledge questions get a text card; data queries get the event table.

### Source badges

| Badge | Colour | Meaning |
|---|---|---|
| ✨ AI | Purple `#7C3AED` | Claude interpreted the query (filter or answer) |
| _(none)_ | — | Regex matched directly — fast path, no AI call |

---

## Data dependencies

| Hook / function | API endpoint | Used by |
|---|---|---|
| `parseNlq(query)` | None — pure function | `NlqPanel`, fast path |
| `POST /api/nlq` | Next.js route → Claude Sonnet 4.6 | `NlqPanel`, AI path |
| `useAuditLog(result.filters)` | `GET /api/v1/audit-log` | `NlqResultTable` (event table mode only) |
