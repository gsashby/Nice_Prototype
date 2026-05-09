# Anthropic Claude API

The application uses the **Anthropic Claude API** to power two AI features: executive dashboard summarisation and per-event causal analysis. Both are implemented as server-side Next.js route handlers so the API key never reaches the browser.

---

## Configuration

| Item | Detail |
|---|---|
| SDK | `@anthropic-ai/sdk` (npm) |
| Model | `claude-sonnet-4-6` |
| Key location | `apps/web/.env.local` → `ANTHROPIC_API_KEY` |
| Client instantiation | Once per route module — `new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })` |

Both routes return a `500` with `{ "error": "ANTHROPIC_API_KEY not configured" }` if the key is missing.

---

## Route 1 — `POST /api/summarize`

**File:** `apps/web/src/app/api/summarize/route.ts`

**Triggered by:** The "Summarize with AI" button in the Governance Dashboard header.

### Request body

```json
{
  "governance_score": 87.4,
  "decisions_today": 1240,
  "policy_violations": 3,
  "compliance_coverage": "98%",
  "alerts": [
    {
      "severity": "critical",
      "title": "Action Blocked — Policy Violation",
      "description": "[inference] blocked: respond on model GPT-4o Autopilot"
    }
  ],
  "models": [
    {
      "name": "GPT-4o Autopilot",
      "governance_score": 91.2,
      "confidence_avg": 0.883
    }
  ]
}
```

All fields are optional — the prompt handles missing values with `?? 'N/A'` fallbacks.

### Claude call

```ts
client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 600,
  messages: [{ role: 'user', content: prompt }],
})
```

### Prompt structure

The prompt instructs Claude to act as an AI governance analyst writing for a senior executive. It includes:
- Four KPI values (governance score, decisions today, policy violations, compliance coverage)
- The full alerts list formatted as bullet points
- Per-model governance score and average confidence

Output format requested: 3–4 sentence executive summary followed by "Key Risks" and "Recommended Actions" sections. No markdown headers — plain paragraphs.

### Response

```json
{ "summary": "Plain-text summary from Claude..." }
```

---

## Route 2 — `POST /api/explain-event`

**File:** `apps/web/src/app/api/explain-event/route.ts`

**Triggered by:** The "Explain with AI" button in the Audit Log event detail drawer.

### Request body

```json
{
  "event": {
    "id": "uuid",
    "event_time": "2025-05-09T14:22:00Z",
    "event_type": "inference",
    "model_name": "GPT-4o Autopilot",
    "outcome": "blocked",
    "confidence_score": 0.412,
    "action": "respond",
    "policy_violations": ["bias-threshold", "pii-detected"],
    "metadata": {}
  },
  "sessionEvents": [
    {
      "event_time": "2025-05-09T14:21:55Z",
      "event_type": "session_start",
      "outcome": "allowed",
      "confidence_score": 0.91,
      "action": "start",
      "policy_violations": []
    }
  ]
}
```

`sessionEvents` is every other event in the same session — fetched client-side by the drawer using `useAuditLog({ search: session_id })` before making this call.

### Claude call

```ts
client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 500,
  messages: [{ role: 'user', content: prompt }],
})
```

### Prompt structure

The prompt instructs Claude to act as a compliance-focused AI governance analyst. It includes:
- Full detail of the focus event (ID, time, type, model, outcome, confidence, action, policy violations, metadata)
- The full session timeline formatted as a chronological table
- Three explicit questions Claude must answer: (1) what triggered the event and why it had that outcome, (2) what the session context tells us about causality, (3) whether this is a genuine risk or expected behaviour

Output format requested: 2–3 focused plain-text paragraphs. No markdown.

### Response

```json
{ "explanation": "Plain-text causal analysis from Claude..." }
```

---

## Data flow

```
User clicks "Summarize with AI" (Dashboard)
       ↓
SummaryModal → POST /api/summarize   (Next.js route handler)
       ↓
Anthropic SDK → claude-sonnet-4-6  (server-side, key never leaves server)
       ↓
{ summary: "..." } returned to modal
```

```
User clicks "Explain with AI" (Audit Log Drawer)
       ↓
AuditLogDrawer fetches full session via useAuditLog({ search: session_id })
       ↓
POST /api/explain-event  with { event, sessionEvents }
       ↓
Anthropic SDK → claude-sonnet-4-6
       ↓
{ explanation: "..." } rendered in drawer
```

---

## Token limits and cost considerations

| Route | `max_tokens` | Typical use |
|---|---|---|
| `/api/summarize` | 600 | ~300–450 tokens in practice |
| `/api/explain-event` | 500 | ~250–400 tokens in practice |

Each call to either route makes exactly one API request to Anthropic. There is no streaming, caching, or batching.
