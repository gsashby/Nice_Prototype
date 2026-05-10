# Natural Language Query (NLQ)

## Overview

The NLQ feature lets users ask plain-English questions against the audit log data. It is embedded at the top of the Governance Dashboard (not a standalone page) and uses a **hybrid interpretation approach**: a synchronous regex parser runs first for speed; Claude Sonnet 4.6 is called only when the regex cannot find any structured filters.

There is no standalone `/nlq` page — the feature lives in `NlqPanel`, which is rendered at the top of `app/(dashboard)/page.tsx`.

---

## Libraries used

| Library | Role |
|---|---|
| **`date-fns`** | `subDays`, `startOfDay`, `endOfDay`, `format` — converts relative time words to ISO date strings in the regex parser; formats today's date in the AI prompt |
| **TanStack Query v5** | `useAuditLog` hook fetches the actual audit events using the translated filters |
| **`@anthropic-ai/sdk`** | Server-side Claude call in `POST /api/nlq` (AI fallback path only) |
| **React** | `useState` in `NlqPanel` holds the current query string, parsed result, and AI loading state |

---

## Hybrid data flow

```
User types query
       ↓
NlqInput (form submit / suggestion click)
       ↓
parseNlq(query)   ← pure function, no network, <1ms
       ↓
  Did regex find structured filters?
  YES ─────────────────────────────────────► NlqResultTable (source: 'regex')
  NO (only fallback search: tag)
       ↓
  POST /api/nlq   ← Next.js server route → Claude Sonnet 4.6
  (tool_choice: forced — always returns structured JSON)
       ↓
  AI succeeds?
  YES ─────────────────────────────────────► NlqResultTable (source: 'ai')
  NO (API error / key missing)
       ↓
  Fall back to regex search result ────────► NlqResultTable (source: 'regex')
       ↓
useAuditLog(result.filters)  → GET /api/v1/audit-log?...
       ↓
Table renders with sortable columns + drillable rows
       ↓
Click a row → AuditLogDrawer (session timeline + Explain with AI)
```

---

## How `parseNlq` works

Located at `apps/web/src/lib/parseNlq.ts`. Returns `{ filters: AuditLogFilters, tags: string[], source: 'regex' }`.

Runs three independent regex passes over the lowercased query string:

### 1. Outcome detection (first match wins)

| Keywords | `filters.outcome` set to |
|---|---|
| `blocked`, `block` | `blocked` |
| `flagged`, `flag`, `violation`, `violations`, `policy` | `flagged` |
| `allowed`, `allow`, `approved`, `approve` | `allowed` |

### 2. Event type detection (first match wins)

| Keywords | `filters.eventType` set to |
|---|---|
| `inference` | `inference` |
| `policy check`, `policy_check` | `policy_check` |
| `bias` | `bias_scan` |
| `session` | `session_start` |
| `model load`, `model_load` | `model_load` |

### 3. Time window detection

| Keywords | Effect on filters |
|---|---|
| `today`, `last 24 hours` | `startDate` = start of today, `endDate` = end of today |
| `last 7 days`, `this week`, `week` | `startDate` = 7 days ago |
| `last 30 days`, `this month`, `month` | `startDate` = 30 days ago |

### Fallback: free-text search

If **none** of the above patterns match, the entire query string is passed as `filters.search` and tagged as `search: "..."`. This is the signal that triggers the AI fallback path in `NlqPanel`.

### Tags

Each matched rule appends a human-readable label to the `tags` array (e.g. `"outcome: blocked"`, `"period: last 7 days"`). These render as blue pills in the results header.

---

## How the AI fallback works

**File:** `apps/web/src/app/api/nlq/route.ts`  
**Model:** `claude-sonnet-4-6`, 256 max tokens  
**Trigger:** `NlqPanel` calls this route when `parseNlq` returns only the `search: "..."` fallback tag.

Claude is called with `tool_choice: { type: 'tool', name: 'set_filters' }`, forcing a structured JSON response matching the `AuditLogFilters` schema every time. Today's date is injected into the prompt to resolve relative time references.

Returns `{ filters: AuditLogFilters, tags: string[], source: 'ai' }`.

**What AI unlocks over regex alone:**

| Query | Regex result | AI result |
|---|---|---|
| `"risky events this week"` | `search: "risky events this week"` | `outcome: blocked, period: last 7 days` |
| `"blocked inference events yesterday"` | `outcome: blocked` (drops type + time) | `outcome: blocked, type: inference, period: yesterday` |
| `"dangerous decisions last month"` | `search: "dangerous decisions last month"` | `outcome: blocked, period: last 30 days` |

---

## Component breakdown

| File | Responsibility |
|---|---|
| `components/nlq/NlqPanel.tsx` | State owner — query string, result, AI loading; hybrid dispatch logic |
| `components/nlq/NlqInput.tsx` | Controlled text input + submit button; `loading` prop shows spinner and disables form during AI call |
| `components/nlq/NlqSuggestions.tsx` | Five hardcoded suggestion chips — always visible |
| `components/nlq/NlqResultTable.tsx` | Fetches events via `useAuditLog`, renders sortable table, opens `AuditLogDrawer` on row click; shows ✨ AI badge when `source === 'ai'`; supports `collapsed` / `onToggleCollapsed` props |
| `lib/parseNlq.ts` | Pure function — query string in, `{ filters, tags, source: 'regex' }` out |
| `app/api/nlq/route.ts` | Server-side Next.js route — calls Claude with tool use for structured filter output |
| `hooks/useAuditLog.ts` | TanStack Query wrapper around `GET /api/v1/audit-log` |

---

## Limitations

- **Regex path only:** Outcome and event type are first-match-wins in the regex parser; a query cannot filter on two outcomes simultaneously via regex. The AI path resolves this for ambiguous queries.
- **AI path latency:** Claude calls take 500 ms–2 s. The input shows "Thinking…" with a spinner; results appear after the call completes.
- **AI graceful fallback:** If the AI call fails (network error, missing API key, rate limit), the raw search result from the regex fallback is used silently — the feature never breaks entirely.
- **Suggested chips use regex:** The five hardcoded suggestion chips all use well-known keywords, so they always hit the fast regex path with no AI call.
