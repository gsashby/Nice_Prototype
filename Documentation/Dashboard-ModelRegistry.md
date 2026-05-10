# Model Registry

**Route:** `/model-registry`  
**File:** `apps/web/src/app/(dashboard)/model-registry/page.tsx`  
**Components:** `apps/web/src/components/model-registry/ModelRegistryTable.tsx`, `ModelDetailDrawer.tsx`, `RegisterModelForm.tsx`  
**Hook:** `apps/web/src/hooks/useModelRegistry.ts`

**Status: Fully implemented.**

---

## Overview

The Model Registry provides a searchable, sortable catalogue of all AI models registered with the NICE AI Trust Center. It surfaces governance health at a glance — including governance score, bias score, confidence average, and inference volume — and allows operators to register new models for monitoring.

---

## Page layout

The page renders three stacked sections:

1. **Summary KPI bar** — five headline metrics across the full model fleet
2. **Register Model form** (toggleable) — inline form to register a new model
3. **Model table** — searchable, sortable list with a detail drawer on row click

---

## Summary KPIs

Computed client-side from the full model list returned by `useModelRegistry()`:

| KPI | Calculation |
|---|---|
| Registered Models | `models.length` |
| Active | `models.filter(m => m.status === 'active').length` |
| Avg Gov. Score | Mean of `governance_score` across all models, formatted as `XX.X%` |
| Critical | `models.filter(m => m.governance_score < 70).length` — coloured red when > 0 |
| Inferences (7d) | Sum of `total_inferences` across all models |

---

## Model table (`ModelRegistryTable`)

A searchable, client-side sortable table with the following columns:

| Column | Field | Notes |
|---|---|---|
| Name | `name` | Left-aligned; links to detail drawer |
| Type | `type` | Colour-coded badge: LLM (purple), Classifier (blue), RAG (teal), Regression (amber) |
| Version | `version` | Mono font |
| Status | `status` | `active` (green) / `inactive` (gray) |
| Gov Score | `governance_score` | Progress bar + coloured percentage: green ≥ 85 %, amber ≥ 70 %, red < 70 % |
| Avg Conf. | `confidence_avg` | Displayed as percentage |
| Inferences | `total_inferences` | Locale-formatted number |
| Violations | `violation_count` | Health badge (Healthy/Watch/Critical) when > 0; `0` otherwise |

**Search** filters by model name and version (case-insensitive substring match, client-side).  
**Sort** is client-side via `useSortable` on all columns. Default sort: none.

Clicking any row opens the `ModelDetailDrawer`.

---

## Model detail drawer (`ModelDetailDrawer`)

A right-side slide-in drawer showing full model detail:

- All table fields in a two-column label/value layout
- Governance score with colour-coded status badge
- Bias score
- Violation count
- Created / updated timestamps (formatted via `date-fns`)
- **"View Audit Events"** button — navigates to `/audit-log?model_id={id}` and pre-filters the audit log to that model's events

The drawer closes on Escape key or clicking the X button.

---

## Register Model form (`RegisterModelForm`)

Toggled by the **+ Register Model** button in the page header. A simple inline card with fields:

| Field | Type | Required |
|---|---|---|
| Model name | Text input | Yes |
| Type | Select: LLM / Classifier / RAG / Regression | Yes |
| Version | Text input | Yes |
| Status | Select: Active / Inactive | Yes |

On submit, calls `POST /api/v1/models` via the `useRegisterModel` mutation. On success, the form closes and the model list is refreshed (query key `['governance', 'models']` is invalidated).

---

## Data hook — `useModelRegistry()`

**File:** `apps/web/src/hooks/useModelRegistry.ts`

```ts
// Read — list all models
function useModelRegistry(): UseQueryResult<RegistryModel[]>
// Calls: GET /api/v1/governance/models
// Transforms: unwraps the .models array from the API response
// Refetch interval: 60 seconds
// Query key: ['governance', 'models']  ← shared with useModelHealth

// Write — register a new model
function useRegisterModel(): UseMutationResult<RegistryModel, unknown, RegisterModelRequest>
// Calls: POST /api/v1/models
// On success: invalidates ['governance', 'models']
```

**Note:** `useModelRegistry` and `useModelHealth` share the same query key (`['governance', 'models']`) because they call the same endpoint. TanStack Query deduplicates the fetch and shares the cache. `useModelRegistry` applies `.then(r => r.models)` to unwrap the array; `useModelHealth` returns the full `{ models }` envelope. If both hooks are active simultaneously, the last-resolved response wins for the shared cache entry.

---

## Data type — `RegistryModel`

```ts
type RegistryModel = {
  id: string;
  tenant_id?: string;
  name: string;
  type: string;            // 'llm' | 'classifier' | 'rag' | 'regression'
  version: string;
  status: 'active' | 'inactive';
  governance_score: number;  // 0–100
  bias_score: number;        // 0–1
  confidence_avg: number;    // 0–1
  total_inferences: number;
  violation_count: number;
  created_at?: string;       // ISO 8601
  updated_at?: string;       // ISO 8601
}

type RegisterModelRequest = {
  name: string;
  type: string;
  version: string;
  status: 'active' | 'inactive';
}
```

---

## Audit log deep-link

The detail drawer's **"View Audit Events"** button uses `useRouter().push('/audit-log?model_id={id}')`. The Audit Log Explorer reads `model_id` from `useSearchParams()` on mount and pre-populates the `modelId` filter, so the audit table immediately shows only events for that model. The `useAuditLog` hook forwards `modelId` as the `model_id` query param to the Go API.
