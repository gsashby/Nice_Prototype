# Board Report Builder

**Route:** `/board-reports`  
**File:** `apps/web/src/app/(dashboard)/board-reports/page.tsx`

**Status: Placeholder — not yet implemented.**

---

## Current state

The page renders a header and a single card with the message `"Report builder — coming soon"`. No data fetching, no interactive components.

---

## Intended purpose

The Board Report Builder is planned as a step-by-step wizard that generates executive-ready AI compliance reports. Based on the page description and sidebar navigation context, the intended feature set includes:

- Selecting a reporting period and scope (modules, models, regulations)
- Auto-populating governance KPIs, policy violation summaries, and model health data
- Generating a formatted report (PDF or structured document)
- Attaching a cryptographic audit certificate for tamper-evidence

---

## What needs to be built

| Component | Description |
|---|---|
| Report wizard UI | Multi-step form: period selection → scope → preview → export |
| Report data aggregation | Combine data from `/api/v1/governance/metrics`, `/api/v1/audit-log`, `/api/v1/policies` |
| PDF/document generation | Client-side (e.g. `jsPDF`, `react-pdf`) or server-side route |
| Audit certificate | Hash of report content + timestamp, potentially signed |
| Report history | List of previously generated reports |
