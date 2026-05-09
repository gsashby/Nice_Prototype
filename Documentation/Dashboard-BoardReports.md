# Board Report Builder

**Route:** `/board-reports`  
**File:** `apps/web/src/app/(dashboard)/board-reports/page.tsx`  
**Components:** `apps/web/src/components/board-reports/ReportConfig.tsx`, `ReportPreview.tsx`  
**Lib:** `apps/web/src/lib/reportCertificate.ts`  
**API routes:** `POST /api/report-summaries`, `POST /api/report-addition`

**Status: Fully implemented.**

---

## Overview

The Board Report Builder is a two-step wizard that generates executive-ready AI compliance reports from live platform data. Reports are designed for board-level audiences — compliance officers, legal teams, and executives — and include an AI-generated narrative, a full data snapshot, and a cryptographic audit certificate.

---

## Two-step wizard flow

### Step 1 — Configure (`ReportConfig`)

The user fills in report metadata and scope:

| Field | Description |
|---|---|
| Report title | Free text — defaults to `"AI Governance Compliance Report"` |
| Prepared by | Author name — defaults to `"Gerald Ashby"` |
| Reporting period | Preset: Last 7 / 30 / 90 days, or custom date range |
| Regulations in scope | Multi-select checkboxes: EU AI Act, GDPR, TCPA, CCPA |

Clicking **Generate Report** fetches all data in parallel, computes the audit certificate, then advances to Step 2.

**Data fetched on generation:**

```
Promise.all([
  GET /api/v1/governance/metrics
  GET /api/v1/governance/models
  GET /api/v1/governance/alerts
  GET /api/v1/policies
  GET /api/v1/audit-log  (total count for period)
  GET /api/v1/audit-log  (blocked count for period)
  GET /api/v1/audit-log  (flagged count for period)
])
```

### Step 2 — Preview & Export (`ReportPreview`)

Renders a print-ready report with nine numbered sections. On mount, the component also auto-calls `POST /api/report-summaries` to generate AI narrative text for four key sections (see below).

---

## Report sections

| # | Section | Content |
|---|---|---|
| 1 | Executive Summary | AI-generated 2–3 sentence overview (Claude) + key KPIs |
| 2 | Compliance Overview | AI-generated compliance narrative + policy enforcement breakdown |
| 3 | Model Performance | AI-generated performance summary + per-model table (gov score, confidence, inferences) |
| 4 | Risk Assessment | AI-generated risk characterisation + alert severity breakdown |
| 5 | KPI Snapshot | Governance score, total decisions, blocked %, flagged %, allowed % |
| 6 | Model Health | Table of all active models with governance score status badge (Healthy / Watch / Critical) |
| 7 | Policy Status | All policies with severity, enabled state, violation count |
| 8 | Active Alerts | List of current alerts with severity badge and title |
| 9 | Audit Certificate | Certificate ID, SHA-256 hash, issued timestamp, expiry |

---

## AI features

### Auto-generated section summaries

Triggered automatically on Step 2 load. Calls `POST /api/report-summaries` with the full report context, receiving four plain-prose summaries keyed by section:

```ts
type Summaries = {
  executive: string;   // § 1 Executive Summary
  compliance: string;  // § 2 Compliance Overview
  performance: string; // § 3 Model Performance
  risk: string;        // § 4 Risk Assessment
}
```

Each summary is rendered in a purple callout below the section header. If the API call fails, summaries are silently skipped — data sections render regardless.

**Route handler:** `apps/web/src/app/api/report-summaries/route.ts`  
**Model:** `claude-sonnet-4-6`, 800 max tokens  
**Input:** Full report context (title, period, governance score, all counts, models, policies, alerts)  
**Output:** JSON with four prose summaries, one per section

### AI report assistant

An input field at the bottom of the preview allows the user to ask Claude to add custom content to the report. Examples: *"Add a section on how we comply with TCPA call recording requirements"*, *"Summarise our model bias performance this quarter"*.

**Topic guard:** Claude rejects off-topic requests (anything unrelated to AI governance, compliance, model performance, policy enforcement, auditing, or regulatory compliance) with a polite refusal. On-topic requests produce 2–3 paragraphs of formal board-level prose.

**Route handler:** `apps/web/src/app/api/report-addition/route.ts`  
**Model:** `claude-sonnet-4-6`, 600 max tokens  
**Output:** `{ outOfScope: false, content: string }` or `{ outOfScope: true, reason: string }`

Accepted additions are appended to the preview below section 8 with a purple left-border callout.

---

## Audit certificate

Generated client-side by `apps/web/src/lib/reportCertificate.ts` using the **Web Crypto API** (`crypto.subtle.digest`).

```ts
type Certificate = {
  id: string;       // e.g. "AITC-LK3M2X8-A1B2C3D4"
  hash: string;     // SHA-256 hex of JSON.stringify(reportPayload)
  issuedAt: string; // ISO 8601
  expiresAt: string;// issuedAt + 1 year
}
```

**Certificate ID format:** `AITC-{base36 timestamp}-{first 8 chars of SHA-256 hash}`

The hash covers the full report payload (config, metrics, audit stats, generation timestamp), making any post-generation modification detectable. The certificate renders in section 9 with a green verification checkmark.

---

## Export / print

The Step 2 preview includes a **Print / Save as PDF** button that calls `window.print()`. The report is styled with print-media CSS: the browser controls, step indicator, and back button are hidden; the report body renders full-width. Users save to PDF via the browser's native print dialog.

---

## Component reference

| Component | File | Purpose |
|---|---|---|
| `BoardReportsPage` | `board-reports/page.tsx` | Step state machine, data fetching on generate, error banner |
| `ReportConfig` | `board-reports/ReportConfig.tsx` | Step 1 form: title, period, regulations |
| `ReportPreview` | `board-reports/ReportPreview.tsx` | Step 2 print-ready render, AI summaries, AI assistant, print trigger |
| `generateCertificate` | `lib/reportCertificate.ts` | SHA-256 hash + certificate ID generation |

---

## Data types

```ts
// Passed from page to ReportPreview
type ReportData = {
  config: ReportConfig;
  metrics: GovernanceMetrics;
  models: ModelHealth[];
  alerts: LiveAlert[];
  policies: Policy[];
  auditStats: { total: number; blocked: number; flagged: number; allowed: number };
  certificate: Certificate;
}

// ReportConfig (step 1 output)
type ReportConfig = {
  title: string;
  preparedBy: string;
  period: '7d' | '30d' | '90d' | 'custom';
  startDate: string;  // ISO 8601
  endDate: string;    // ISO 8601
  regulations: string[];
}
```
