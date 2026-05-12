# Natural Language Query (NLQ)

## Overview

The NLQ feature lets users ask plain-English questions against the audit log data. It is embedded at the top of the Governance Dashboard (not a standalone page) and uses a **hybrid interpretation approach**:

1. A synchronous regex parser runs first for speed and handles the majority of governance queries.
2. Claude Sonnet 4.6 is called when the regex cannot produce structured filters **or** when the query is analytical/conversational.
3. Off-topic queries (unrelated to AI governance) are rejected with a yellow warning card — Claude never answers them.

There is no standalone `/nlq` page — the feature lives in `NlqPanel`, rendered at the top of `app/(dashboard)/page.tsx`.

---

## Libraries used

| Library | Role |
|---|---|
| **`date-fns`** | `subDays`, `subHours`, `startOfDay`, `endOfDay`, `format` — converts relative time words to ISO date strings in the regex parser; formats today's date in the AI prompt |
| **TanStack Query v5** | `useAuditLog` hook fetches the actual audit events using the translated filters |
| **`@anthropic-ai/sdk`** | Server-side Claude call in `POST /api/nlq` (AI path only) |
| **React** | `useState` in `NlqPanel` holds query string, result, off-topic message, and AI loading state |

---

## Hybrid data flow

```
User types query
       ↓
NlqInput (form submit / suggestion click)
       ↓
parseNlq(query)   ← pure function, no network, <1ms
  Returns { filters, tags, source: 'regex', kind: 'filter' | 'question' }
       ↓
shouldUseAI(parsed)?
  ├── NO  (structured filters found AND kind = 'filter')
  │         ↓
  │   NlqResultTable (source: 'regex')
  │
  └── YES (only search fallback tag  OR  kind = 'question')
            ↓
      POST /api/nlq  → Claude Sonnet 4.6 (three-tool dispatch)
            ↓
      ┌─────────────────────────────────────────────────────────┐
      │ reject_query     → HTTP 400 { error: 'off_topic' }      │
      │   → Yellow warning card; no result table shown          │
      │                                                          │
      │ answer_question  → { kind: 'question', answer, tags }   │
      │   → Text answer card (no event table)                   │
      │                                                          │
      │ set_filters      → { kind: 'filter', filters, tags,     │
      │                       context? }                         │
      │   → NlqResultTable with optional blue context banner    │
      └─────────────────────────────────────────────────────────┘
            ↓ (on AI error — graceful fallback)
      regex search result ──────────────────► NlqResultTable (source: 'regex')

useAuditLog(result.filters)  → GET /api/v1/audit-log?...
       ↓
Table renders with sortable columns + drillable rows
       ↓
Click a row → AuditLogDrawer (session timeline + Explain with AI)
```

---

## How `parseNlq` works

Located at `apps/web/src/lib/parseNlq.ts`. Returns `{ filters: AuditLogFilters, tags: string[], source: 'regex', kind: NlqKind }`.

### Query kind detection

Before running filter matching, `parseNlq` classifies the query as `'filter'` or `'question'`:

- **`'question'`** — analytical or conversational queries that need an AI text answer:
  - Starts with `how many`, `how often`, `why`, `explain`, `compare`, `summarize`, `analyze`, `which model has`, `what caused`, etc.
  - Contains analytical keywords: `trend`, `breakdown`, `analysis`, `insight`, `anomaly`, `most common`, `root cause`, etc.
- **`'filter'`** — everything else (show, list, find, display).

`'question'` kind always routes to the AI even when the regex also extracted structured filters (e.g. "how many blocked events this week?" has `outcome: blocked` + `period: last 7 days` from regex but still goes to AI for a contextual answer).

### 1. Outcome detection (first match wins)

| Keywords | `filters.outcome` set to |
|---|---|
| `blocked`, `block` | `blocked` |
| `non-compliant`, `noncompliant` | `flagged` |
| `flagged`, `flag`, `violation`, `violations`, `policy` (not `policy check`) | `flagged` |
| `auto-applied`, `auto-approved`, `automatically applied` | `auto-applied` |
| `allowed`, `allow`, `approved`, `approve` | `allowed` |

### 2. Event type detection (first match wins)

| Keywords | `filters.eventType` set to |
|---|---|
| `inference` | `inference` |
| `policy check`, `policy_check` | `policy_check` |
| `bias scan`, `bias`, `fairness` | `bias_scan` |
| `session end`, `session_end` | `session_end` |
| `session start`, `session` | `session_start` |
| `model load`, `model_load` | `model_load` |

### 3. Time window detection

| Keywords | Effect on filters |
|---|---|
| `today`, `last 24 hours`, `past 24 hours` | `startDate` = start of today, `endDate` = end of today |
| `yesterday` | `startDate` / `endDate` = full yesterday |
| `last 7 days`, `last week`, `this week`, `past week` | `startDate` = 7 days ago |
| `last 30 days`, `last month`, `this month`, `past month` | `startDate` = 30 days ago |
| `last 90 days`, `last quarter`, `this quarter`, `past quarter` | `startDate` = 90 days ago |
| `last hour`, `past hour`, `last 60 minutes` | `startDate` = 1 hour ago |
| `last N days` (dynamic) | `startDate` = N days ago |
| `last N hours` (dynamic) | `startDate` = N hours ago |

### 4. Model name detection

Filters by `filters.modelName` (ILIKE match on the backend join):

| Keywords | `filters.modelName` set to |
|---|---|
| `autopilot` | `Autopilot` |
| `copilot` | `Copilot` |
| `mpower` | `Mpower` |
| `gpt-4`, `gpt4` | `GPT-4` |
| `gpt-3.5`, `gpt3.5` | `GPT-3.5` |
| `claude` | `Claude` |
| `llama` | `Llama` |
| `gemini` | `Gemini` |
| `mistral` | `Mistral` |

### 5. Result limit

`top N`, `first N`, or `show N` sets `filters.pageSize = N` (capped at 200).

### 6. Fallback: free-text search

If **none** of the above patterns match, the entire query string is passed as `filters.search` and tagged as `search: "..."`. This signals the AI path in `NlqPanel`.

### Tags

Each matched rule appends a human-readable label to the `tags` array (e.g. `"outcome: blocked"`, `"period: last 7 days"`, `"model: Autopilot"`). These render as blue pills in the results header.

---

## How the AI path works

**File:** `apps/web/src/app/api/nlq/route.ts`  
**Model:** `claude-sonnet-4-6`, 512 max tokens  
**Trigger:** `NlqPanel` calls this route when `shouldUseAI(parsed)` returns true.

### Three-tool dispatch

Claude is called with `tool_choice: { type: 'auto' }` and three available tools:

#### `set_filters`
For data retrieval queries — returns structured `AuditLogFilters` and optionally a `context` string explaining what the data shows. Used for both direct filter queries ("show blocked events") and analytical count/data questions ("how many blocked events this week?").

Returns: `{ kind: 'filter', filters, tags, context? }`  
UI: event table with optional blue context banner above it.

#### `answer_question`
For governance knowledge questions — definitions, regulatory requirements, concept explanations, best practices. Claude answers without needing to query the audit log.

Returns: `{ kind: 'question', answer, tags }`  
UI: text answer card (no event table shown).

#### `reject_query`
For queries entirely unrelated to AI governance (cooking, weather, sports, etc.).

Returns: HTTP 400 `{ error: 'off_topic', message: '...' }`  
UI: yellow warning card with the rejection reason.

### Governance scope

The system prompt restricts Claude to: AI model audit events, governance metrics, policy compliance, bias/fairness monitoring, AI regulatory frameworks (GDPR, EU AI Act, ISO 42001, SOC 2), and CXone AI modules (Autopilot, Copilot, Mpower).

Today's date is injected into the user message to resolve relative time references.

### AI unlocks over regex alone

| Query | Regex result | AI result |
|---|---|---|
| `"risky events this week"` | `search: "risky events this week"` | `outcome: blocked, period: last 7 days` |
| `"dangerous decisions last month"` | `search: "..."` | `outcome: blocked, period: last 30 days` |
| `"how many blocked events this week?"` | `outcome: blocked, period: last 7 days` (but kind=question) | `set_filters` + context banner: "Showing blocked events from the last 7 days…" |
| `"what is the difference between blocked and flagged?"` | `outcome: flagged` (but kind=question) | `answer_question` with detailed governance explanation |
| `"what is the EU AI Act?"` | `search: "..."` | `answer_question` with regulatory summary |
| `"best chocolate cake recipe"` | `search: "..."` | HTTP 400 off-topic rejection |

### Error handling

If the AI call fails (network error, missing API key, rate limit), `NlqPanel` silently falls back to the regex result — the feature never breaks entirely.

---

## Component breakdown

| File | Responsibility |
|---|---|
| `components/nlq/NlqPanel.tsx` | State owner — query string, result, off-topic message, AI loading; hybrid dispatch logic; renders off-topic warning card |
| `components/nlq/NlqInput.tsx` | Controlled text input + submit button; `loading` prop shows spinner and disables form during AI call |
| `components/nlq/NlqSuggestions.tsx` | Two groups of suggestions: 10 filter query chips (blue) and 8 AI governance question chips (purple) |
| `components/nlq/NlqResultTable.tsx` | Shows text answer card when `result.answer` is set; shows event table otherwise; blue context banner when `result.context` is set; ✨ AI badge when `source === 'ai'` |
| `lib/parseNlq.ts` | Pure function — query string in, `{ filters, tags, source: 'regex', kind }` out |
| `app/api/nlq/route.ts` | Server-side Next.js route — three-tool Claude dispatch with governance scope enforcement |
| `hooks/useAuditLog.ts` | TanStack Query wrapper around `GET /api/v1/audit-log` |

---

## Limitations

- **Outcome/event type are first-match-wins in regex** — a query cannot filter on two outcomes simultaneously via the fast path. The AI path resolves this for complex queries.
- **AI path latency** — Claude calls take 500 ms–2 s. The input shows "Thinking…" with a spinner.
- **Answer questions have no live data** — `answer_question` responses are from Claude's training knowledge, not live audit metrics. For data-specific answers, Claude uses `set_filters` to show the relevant records.
- **Filter suggestions use regex** — all 10 filter suggestion chips use well-known keywords and hit the fast regex path with no AI call.
