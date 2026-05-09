# Policy Engine

**Route:** `/policy-engine`  
**File:** `apps/web/src/app/(dashboard)/policy-engine/page.tsx`

The Policy Engine allows administrators to view, create, and toggle governance rules that control AI behaviour across all NICE CXone Mpower modules.

---

## Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Page Header — "Policy Engine" + New Policy button            │
├─────────────────────────────────────────────────────────────┤
│ [PolicyBuilder — shown only when New Policy is clicked]      │
├─────────────────────────────────────────────────────────────┤
│ PolicyList — sortable table of all policies                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Header

| Button | Behaviour |
|---|---|
| **+ New Policy** (blue) | Toggles the `PolicyBuilder` form into view above the list |
| **Cancel** (white/border) | Hides the `PolicyBuilder` — shown instead of "+ New Policy" when form is open |

---

## Policy List

Component: `PolicyList`  
Data source: `usePolicies()` → `GET /api/v1/policies`

All columns are sortable via the `useSortable` hook (client-side, current page only).

| Column | Field | Notes |
|---|---|---|
| Policy Name | `name` | Bold, dark text |
| Description | `description` | Muted text |
| Severity | `severity` | Colour-coded badge: Critical (red), High (orange), Medium (amber), Low (blue) |
| Status | `enabled` | Toggle button — see below |
| Violations (7d) | `violationCount` | Count returned from API |

### Status toggle

The Status cell is an interactive button that calls `useTogglePolicy` → `PATCH /api/v1/policies/:id/toggle`.

| State | Appearance |
|---|---|
| Enabled | Green pill with green dot — `"Enabled"` |
| Disabled | Grey pill with grey dot — `"Disabled"` |

Clicking toggles the `enabled` value and sends the new state to the API. The button is disabled (opacity 60%) while the mutation is pending. On success, TanStack Query invalidates the `['policies']` cache and refetches the list automatically.

### Loading and error states

- Loading: 5 `LoadingSkeleton` rows of height 40px
- API error: red banner "Failed to load policies — is the API running?"

---

## Policy Builder

Component: `PolicyBuilder`  
Shown: above the policy list, toggled by the "+ New Policy" button  
API call: `useCreatePolicy()` → `POST /api/v1/policies`

### Form fields

| Field | Type | Required | Notes |
|---|---|---|---|
| Name | Text input | Yes | Placeholder: `"e.g. Block PII in responses"` |
| Description | Textarea (2 rows) | No | — |
| Severity | Select dropdown | Yes | Options: Critical, High, Medium, Low; defaults to Medium |

New policies are always created with `enabled: true` and an empty `rule_config: {}`.

### Submission

The **Create Policy** button submits the form. It shows `"Creating…"` and is disabled while the mutation is pending. On success, the builder form is hidden (`onCreated()` callback) and the policy list refetches. On error, a red inline message is shown above the form fields.

---

## Data dependencies

| Hook | API endpoint | Used by |
|---|---|---|
| `usePolicies` | `GET /api/v1/policies` | Policy list |
| `useTogglePolicy` | `PATCH /api/v1/policies/:id/toggle` | Status toggle button |
| `useCreatePolicy` | `POST /api/v1/policies` | Policy builder form |
