# Anthropic Claude API

The application uses the **Anthropic Claude API** to power five AI features: executive dashboard summarisation, per-event causal analysis, board report narrative generation, AI report assistant, and NLQ hybrid query interpretation. All are implemented as server-side Next.js route handlers so the API key never reaches the browser.

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

---

## Route 3 — `POST /api/report-summaries`

**File:** `apps/web/src/app/api/report-summaries/route.ts`

**Triggered by:** Board Report Builder Step 2, automatically on mount.

Generates four independent plain-prose summaries for the report sections. The full report context is sent in a single prompt; Claude returns a JSON object with four keyed sections.

### Claude call

```ts
client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 800,
  messages: [{ role: 'user', content: prompt }],
})
```

### Response

```json
{
  "summaries": {
    "executive": "...",   // § 1 Executive Summary
    "compliance": "...", // § 2 Compliance Overview
    "performance": "...",// § 3 Model Performance
    "risk": "..."        // § 4 Risk Assessment
  }
}
```

If the call fails, `ReportPreview` silently skips AI summaries — all data sections still render.

---

## Route 4 — `POST /api/report-addition`

**File:** `apps/web/src/app/api/report-addition/route.ts`

**Triggered by:** The AI assistant input field at the bottom of the Board Report preview.

Accepts a free-text user request and the full report context. Includes a **topic guard**: Claude first assesses whether the request is related to AI governance, compliance, model performance, policy enforcement, auditing, or regulatory compliance. Off-topic requests return `outOfScope: true` without generating content.

### Claude call

```ts
client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 600,
  messages: [{ role: 'user', content: prompt }],
})
```

### Response

```json
{ "outOfScope": false, "content": "2–3 paragraphs of board-level prose..." }
// or
{ "outOfScope": true, "reason": "One sentence explaining why this is out of scope" }
```

---

## Route 5 — `POST /api/nlq`

**File:** `apps/web/src/app/api/nlq/route.ts`

**Triggered by:** `NlqPanel` when the regex parser fails to find structured filters (only the raw `search:` fallback tag is produced).

Uses **tool use** with `tool_choice: { type: 'tool', name: 'set_filters' }` to force a structured JSON response matching the `AuditLogFilters` schema — no hallucinated field names are possible. Today's date is injected into the prompt to resolve relative time references ("yesterday", "last week").

### Claude call

```ts
client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 256,
  tools: [{ name: 'set_filters', input_schema: { /* AuditLogFilters schema */ } }],
  tool_choice: { type: 'tool', name: 'set_filters' },
  messages: [{ role: 'user', content: prompt }],
})
```

### Response

```json
{ "filters": { "outcome": "blocked", "startDate": "2026-05-08T00:00:00Z" }, "tags": ["outcome: blocked", "period: yesterday"], "source": "ai" }
```

---

## Token limits and cost considerations

| Route | `max_tokens` | Typical use |
|---|---|---|
| `/api/summarize` | 600 | ~300–450 tokens in practice |
| `/api/explain-event` | 500 | ~250–400 tokens in practice |
| `/api/report-summaries` | 800 | ~500–700 tokens (four sections) |
| `/api/report-addition` | 600 | ~200–500 tokens per addition |
| `/api/nlq` | 256 | ~50–150 tokens (structured output only) |

Each call makes exactly one API request to Anthropic. There is no streaming, caching, or batching.
