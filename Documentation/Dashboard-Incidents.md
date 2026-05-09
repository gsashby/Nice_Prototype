# Incident Timeline

**Route:** `/incidents`  
**Files:**
- `apps/web/src/app/(dashboard)/incidents/page.tsx`
- `apps/web/src/components/incidents/IncidentTimeline.tsx`

The Incident Timeline is a chronological log of AI policy violations and blocked actions. Where the Audit Log Explorer shows every event in a table, the Incident Timeline surfaces only the actionable events — blocked and flagged decisions — in a visual timeline format optimised for incident review.

---

## Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Page Header — "Incident Timeline"                            │
├──────────────┬──────────────┬──────────────┬────────────────┤
│ Total        │ Blocked      │ Flagged      │ Audit Period   │
│ Incidents    │ (Crit/High)  │ (Med/Low)    │                │
├─────────────────────────────────────────────────────────────┤
│ [Blocked | Flagged] tab switcher     description text       │
├─────────────────────────────────────────────────────────────┤
│ Today                                                        │
│ ●── [CRITICAL] Action Blocked — inference    14:22:03 · 3m  │
│ │   CXone Virtual Agent v3 · confidence: 41.2%              │
│ │   [Confidence Floor] [PII Redaction]                       │
│ │   sess-abc123            View Details →                    │
│ ●── [HIGH] Action Blocked — policy_check     14:15:11 · 10m │
│ │   ...                                                      │
│ Yesterday                                                    │
│ ●── [MEDIUM] Action Flagged — inference      09:03:44 · 1d  │
│ │   ...                                                      │
│ [Load More (N remaining)]                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Summary KPI Cards

Component: inline `SummaryKpis` in `page.tsx`

Four cards rendered in a 4-column grid. The Blocked and Flagged totals come from two lightweight parallel `useAuditLog` calls with `pageSize: 1` — the API `total` field gives the full count without fetching all events.

| Card | Value | Source |
|---|---|---|
| Total Incidents | Blocked total + Flagged total | Two parallel API calls |
| Blocked (Critical/High) | Total events with `outcome: blocked` | `useAuditLog({ outcome: 'blocked', pageSize: 1 }).data.total` |
| Flagged (Medium/Low) | Total events with `outcome: flagged` | `useAuditLog({ outcome: 'flagged', pageSize: 1 }).data.total` |
| Audit Period | Hardcoded `"All time"` | — |

---

## Tab Switcher

Two tabs in a pill-style toggle: **Blocked** and **Flagged**. Switching tabs re-mounts `IncidentTimeline` via a `key={tab}` prop, which resets its internal `pageSize` state and triggers a fresh fetch. The tab description line updates to describe the severity range.

| Tab | `outcome` filter | Severity range |
|---|---|---|
| Blocked | `blocked` | Critical & High |
| Flagged | `flagged` | Medium & Low |

---

## `IncidentTimeline` Component

**File:** `apps/web/src/components/incidents/IncidentTimeline.tsx`

Receives `outcome: 'blocked' | 'flagged'` as a prop. Manages its own `pageSize` state starting at 25. Uses `useAuditLog` with the supplied outcome filter.

### Severity derivation

Severity is computed client-side from two fields of the audit event:

| Outcome | Policy violations | Severity | Dot colour |
|---|---|---|---|
| `blocked` | > 0 | Critical | Red `#EF4444` |
| `blocked` | 0 | High | Orange `#F97316` |
| `flagged` | > 0 | Medium | Amber `#F59E0B` |
| `flagged` | 0 | Low | Blue `#3B82F6` |

### Date grouping

Events are grouped by calendar day using `date-fns`. Group labels:
- Events from today → **Today**
- Events from yesterday → **Yesterday**
- Older events → **Month D, YYYY** (e.g. `May 7, 2025`)

Each group opens with a small gray dot on the rail and a muted uppercase date label.

### Timeline rail

A 1px `#E5E7EB` left border runs the full height of the timeline. Each event positions its coloured dot on the rail using `position: absolute; left: 0; transform: translateX(-50%)`. Cards are offset to the right with `padding-left: 2rem`.

### Incident cards

Each card shows:

| Element | Source | Notes |
|---|---|---|
| Severity badge | Derived (see above) | Coloured pill — CRITICAL / HIGH / MEDIUM / LOW |
| Title | `outcome` | "Action Blocked" or "Action Flagged" |
| Event type | `event_type` | Appended after em-dash: "— inference" |
| Timestamp | `event_time` | Absolute `HH:mm:ss` + relative ("3 minutes ago") |
| Model | `model_name` | Plain text; `—` if null |
| Confidence | `confidence_score` | `XX.X%`, colour-coded green ≥85% / amber ≥70% / red <70% |
| Action | `action` | Monospaced; omitted if null |
| Policy violations | `policy_violations` | Red pills; omitted if empty |
| Session / Agent ID | `session_id` \|\| `agent_id` \|\| `id` | Monospaced, truncated |
| View Details | — | Right-aligned link text; clicking opens `AuditLogDrawer` |

Clicking anywhere on the card opens the `AuditLogDrawer` with the full event detail, session timeline, and Explain with AI.

### Load More

A "Load More (N remaining)" button appears when `events.length < total`. Clicking it increments `pageSize` by 25, which changes the TanStack Query key and triggers a new fetch returning a larger result set. A spinner is shown while `isFetching` is true. The remaining count is `total - events.length`.

### States

| State | Display |
|---|---|
| Loading (initial) | 5 `LoadingSkeleton` rows at height 96px |
| Empty | `"No {outcome} incidents in this period"` centered |
| Loaded | Date-grouped timeline cards |
| Loading more | Spinner in Load More button |

---

## Data dependencies

| Hook | API endpoint | Used by | Notes |
|---|---|---|---|
| `useAuditLog({ outcome: 'blocked', pageSize: 1 })` | `GET /api/v1/audit-log` | `SummaryKpis` | Only fetches total count |
| `useAuditLog({ outcome: 'flagged', pageSize: 1 })` | `GET /api/v1/audit-log` | `SummaryKpis` | Only fetches total count |
| `useAuditLog({ outcome, pageSize })` | `GET /api/v1/audit-log` | `IncidentTimeline` | Expands pageSize on Load More |

No new API endpoints are required. All incident data is derived from `audit_events` via the existing `GET /api/v1/audit-log` endpoint using the `outcome` filter.

---

## Known limitations

| Limitation | Impact |
|---|---|
| No combined Blocked + Flagged view | The API only filters by one outcome at a time; showing both simultaneously would require two parallel queries and client-side merge |
| Client-side severity derivation | Severity is computed from `outcome` + `policy_violations.length`; more nuanced severity (e.g. based on specific policy names) would require server-side logic |
| Audit Period is static | The "All time" KPI card and timeline always query the full history; a date range filter would require additional state and UI controls |
| Load More replaces all data | Increasing `pageSize` re-fetches from page 1 with a larger result set rather than appending a true next page; for very large datasets this is inefficient |
