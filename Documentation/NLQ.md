# Natural Language Query (NLQ)

## Overview

The NLQ feature lets users ask plain-English questions against the audit log data. There is no AI or LLM involved — it is built entirely in the browser using a hand-rolled keyword parser (`parseNlq.ts`) combined with the existing audit log REST API.

---

## Libraries used

| Library | Role |
|---|---|
| **`date-fns`** | `subDays`, `startOfDay`, `endOfDay`, `format` — converts relative time words ("today", "last 7 days") into ISO date strings |
| **TanStack Query v5** | `useAuditLog` hook fetches the actual audit events using the translated filters |
| **React** | `useState` in `NlqPage` holds the current query string and parsed result |

> `useNlq.ts` exists in `hooks/` but points to a never-built `localhost:8001` AI service — it is dead code. The live feature uses `parseNlq` + `useAuditLog` instead.

---

## Data flow

```
User types query
       ↓
NlqInput (form submit / suggestion click)
       ↓
parseNlq(query)   ← pure function, no network
       ↓
  Returns: { filters: AuditLogFilters, tags: string[] }
       ↓
NlqResultTable receives `result`
       ↓
useAuditLog(result.filters)   ← TanStack Query → GET /api/v1/audit-log?...
       ↓
Table renders with sortable columns + drillable rows
       ↓
Click a row → AuditLogDrawer (session timeline + Explain with AI)
```

---

## How `parseNlq` works

Located at `apps/web/src/lib/parseNlq.ts`.

It runs three independent regex passes over the lowercased query string, each populating an `AuditLogFilters` object:

### 1. Outcome detection

| Keywords | `filters.outcome` set to |
|---|---|
| `blocked`, `block` | `blocked` |
| `flagged`, `flag`, `violation`, `violations`, `policy` | `flagged` |
| `allowed`, `allow`, `approved`, `approve` | `allowed` |

### 2. Event type detection

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

If **none** of the above patterns match, the entire query string is passed as `filters.search`. The API performs an `ILIKE` match against session ID, agent ID, model name, and other text fields.

### Tags

Each matched rule appends a human-readable label to the `tags` array (e.g. `"outcome: blocked"`, `"period: last 7 days"`). These are rendered as blue pills in the results header so the user can see exactly what was interpreted.

---

## Component breakdown

| File | Responsibility |
|---|---|
| `app/(dashboard)/nlq/page.tsx` | Page state — holds `query` string and `NlqResult`, wires `parseNlq` to user input |
| `components/nlq/NlqInput.tsx` | Controlled text input + submit button |
| `components/nlq/NlqSuggestions.tsx` | Hardcoded suggested query chips shown before a query is run |
| `components/nlq/NlqResultTable.tsx` | Fetches events via `useAuditLog`, renders sortable table, opens `AuditLogDrawer` on row click |
| `lib/parseNlq.ts` | Pure function — query string in, `{ filters, tags }` out |
| `hooks/useAuditLog.ts` | TanStack Query wrapper around `GET /api/v1/audit-log` |

---

## Limitations

- No semantic understanding — relative dates like "last Tuesday" or "yesterday" are not handled.
- Outcome and event type are each first-match-wins; a query cannot filter on two outcomes simultaneously.
- If any keyword matches (outcome, event type, or time window), the free-text search fallback is skipped entirely.
- `useNlq.ts` scaffolds a real AI NLQ backend (`POST /api/v1/ai/nlq/query`) but that service does not exist; the hook is unused.
