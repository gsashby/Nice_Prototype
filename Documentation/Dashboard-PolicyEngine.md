# Policy Engine

**Route:** `/policy-engine`  
**File:** `apps/web/src/app/(dashboard)/policy-engine/page.tsx`

The Policy Engine is the real-time governance gate that evaluates every AI request passing through the NICE CXone Mpower trust layer. It allows administrators to create, edit, delete, and toggle the governance rules that control AI behaviour across all Autopilot, Copilot, and Mpower Agent modules.

---

## Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Page Header — "Policy Engine" + New Policy button            │
├─────────────────────────────────────────────────────────────┤
│ About the Policy Engine — description card                   │
├─────────────────────────────────────────────────────────────┤
│ [PolicyBuilder — shown when New Policy or Edit is active]    │
├─────────────────────────────────────────────────────────────┤
│ PolicyList — sortable table of all policies                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Page description card

A full-width card below the header explains what the Policy Engine does and how to use it. It contains a prose summary and four feature tiles:

| Tile | Description |
|---|---|
| **Real-time enforcement** | Every AI request is checked against all active policies before a response is returned |
| **Severity levels** | Critical and High violations block the request outright; Medium and Low flag it for review |
| **Enable / disable** | Policies can be toggled on or off without deletion — useful for testing or seasonal rules |
| **Violation tracking** | The 7-day violation count shows which policies are triggering most frequently |

---

## Header

| Control | Behaviour |
|---|---|
| **+ New Policy** (blue) | Opens the `PolicyBuilder` form in create mode above the list; closes any active edit form |
| **Cancel** (white/border) | Hides the `PolicyBuilder` — shown in place of "+ New Policy" while the new-policy form is open |

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
| Violations (7d) | `violationCount` | 7-day count from API |
| Actions | — | Edit and Delete icon buttons — see below |

### Status toggle

The Status cell is an interactive button that calls `useTogglePolicy` → `PATCH /api/v1/policies/:id/toggle`.

| State | Appearance |
|---|---|
| Enabled | Green pill with green dot — `"Enabled"` |
| Disabled | Grey pill with grey dot — `"Disabled"` |

Clicking toggles the `enabled` value and sends the new state to the API. The button is disabled (opacity 60%) while the mutation is pending. On success, TanStack Query invalidates the `['policies']` cache and refetches the list.

### Actions column

Each row has two action buttons:

| Button | Icon | Behaviour |
|---|---|---|
| **Edit** | Pencil | Opens `PolicyBuilder` in edit mode pre-filled with the policy's name, description, and severity. Clears any open "new policy" form. |
| **Delete** | Trash | Replaces the action buttons with an inline confirmation: `Delete? [Yes] [Cancel]`. Clicking **Yes** calls `useDeletePolicy` → `DELETE /api/v1/policies/:id`. Clicking **Cancel** dismisses with no change. |

The inline delete confirmation prevents accidental deletion without requiring a separate modal. Only one row can be in confirmation state at a time. On successful deletion the policy list automatically refetches.

### Loading and error states

- Loading: 5 `LoadingSkeleton` rows of height 40px
- API error: red banner "Failed to load policies — is the API running?"

---

## Policy Builder

Component: `PolicyBuilder`  
Shown: above the policy list, in either create or edit mode  
Props: `onDone: () => void`, `policy?: EditablePolicy`

The form operates in two modes depending on whether the `policy` prop is provided:

| Mode | Trigger | API call | Button label |
|---|---|---|---|
| **Create** | "+ New Policy" button | `useCreatePolicy()` → `POST /api/v1/policies` | Create Policy |
| **Edit** | Edit icon in Actions column | `useUpdatePolicy()` → `PUT /api/v1/policies/:id` | Save Changes |

### Form fields

| Field | Type | Required | Notes |
|---|---|---|---|
| Name | Text input | Yes | Placeholder: `"e.g. Block PII in responses"` |
| Description | Textarea (2 rows) | No | — |
| Severity | Select dropdown | Yes | Options: Critical, High, Medium, Low. Help text explains blocking vs flagging behaviour. |

In create mode, severity defaults to Medium and `enabled` defaults to `true`.  
In edit mode, all fields are pre-filled from the selected policy, including the rule condition.

### Trigger Conditions (rule editor)

Every policy includes one or more structured trigger conditions that tell the system exactly when to fire. These are stored as `rule_config` JSON in the database and evaluated by the Trust Layer on every AI request.

#### Condition rows

Each condition is a self-contained row with three selectors:

**Field**

| Option | Description |
|---|---|
| Confidence Score | Numeric — the model's self-reported confidence in its response (0–1) |
| Event Type | The class of AI event: `inference`, `policy_check`, `bias_scan`, `session_start`, `model_load` |
| Outcome | The current event outcome: `allowed`, `blocked`, `flagged` |
| Model Name | The name of the AI model that generated the response |

**Is (operator)** — auto-populates when the field changes:

| Field | Available operators |
|---|---|
| Confidence Score | falls below, rises above |
| Event Type | is, is not |
| Outcome | is, is not |
| Model Name | equals, is not, contains |

**Value** — dynamic input based on field type:
- Confidence Score → number input (0–1, step 0.01)
- Event Type → dropdown of known event types
- Outcome → dropdown of `allowed`, `blocked`, `flagged`
- Model Name → free text input

#### Multiple conditions

Click **+ Add condition** to add additional rows. When more than one condition is present, an **AND / OR** toggle appears at the top of each subsequent row:

| Setting | Behaviour |
|---|---|
| **AND** (blue) | All conditions must be true simultaneously for the rule to fire |
| **OR** (purple) | Any single condition being true is sufficient to fire the rule |

The logic setting is shared across all rows — the entire rule evaluates as `(cond1) AND (cond2) AND …` or `(cond1) OR (cond2) OR …`.

Click the **×** button on any row to remove it. At least one condition must always remain.

#### Live preview

A blue monospaced banner below the condition rows shows the complete rule as a readable expression that updates in real time, e.g.:

```
IF (conf. score < 0.70) AND (event type = inference) → BLOCK
```

#### Then (action selector)

Three toggle buttons choose what happens when the rule fires:

| Action | Behaviour |
|---|---|
| ⊘ Block request | The request is rejected before it reaches the model. Event logged as `"blocked"`. |
| ⚑ Flag for review | The request is allowed but marked `"flagged"` and surfaced in the Alert feed. |
| ✓ Allow with logging | The request is allowed and logged as `"allowed"` with a note for the audit trail. |

A help sentence below the action buttons describes exactly what will happen when the rule fires.

### rule_config JSON structure

Every policy created or edited through the form stores the following in `rule_config`:

```json
{
  "conditions": [
    { "field": "confidence_score", "operator": "below",  "value": 0.70 },
    { "field": "event_type",       "operator": "equals", "value": "inference" }
  ],
  "logic": "AND",
  "action": "block"
}
```

Single-condition policies are stored in the same array format (one element, `logic` defaults to `"AND"`). Seed policies that use the legacy `"condition"` (singular) key are read correctly and converted to the array format on the next save.

### Rule summary in the policy list

The policy list's **Description & Rule** column shows the human-readable description and, where a structured condition exists, a compact inline summary of every condition and the action:

```
Block AI responses with low confidence during inference
[conf. score < 0.70]  [AND]  [event type = inference]  [→ block]
```

Each condition is a monospace code tag. AND/OR logic badges are colour-coded (blue for AND, purple for OR). The action badge is colour-coded (red for block, amber for flag, green for allow). Seed policies that use the legacy `rule_config` format display only their description.

### Submission

The submit button shows `"Creating…"` or `"Saving…"` and is disabled while the mutation is pending. On success, `onDone()` is called, which hides the form and clears the editing state. On error, a red inline message is shown above the form fields.

---

## API endpoints

| Method | Path | Hook | Description |
|---|---|---|---|
| `GET` | `/api/v1/policies` | `usePolicies` | List all policies with 7-day violation counts |
| `POST` | `/api/v1/policies` | `useCreatePolicy` | Create a new policy |
| `PUT` | `/api/v1/policies/:id` | `useUpdatePolicy` | Update name, description, severity, and enabled state |
| `DELETE` | `/api/v1/policies/:id` | `useDeletePolicy` | Permanently remove a policy |
| `PATCH` | `/api/v1/policies/:id/toggle` | `useTogglePolicy` | Flip the enabled state only |

All endpoints accept a `tenant_id` query parameter (defaults to the seed tenant).

### Validation (Create and Update)

| Rule | HTTP status | Error message |
|---|---|---|
| `name` is empty | 400 | `"name is required"` |
| `severity` not in `critical\|high\|medium\|low` | 400 | `"severity must be critical\|high\|medium\|low"` |
| Policy ID not found (Update / Delete) | 404 | `"policy not found"` |

---

## Data dependencies

| Hook | API endpoint | Used by |
|---|---|---|
| `usePolicies` | `GET /api/v1/policies` | Policy list |
| `useCreatePolicy` | `POST /api/v1/policies` | PolicyBuilder (create mode) |
| `useUpdatePolicy` | `PUT /api/v1/policies/:id` | PolicyBuilder (edit mode) |
| `useDeletePolicy` | `DELETE /api/v1/policies/:id` | Delete confirmation in PolicyList |
| `useTogglePolicy` | `PATCH /api/v1/policies/:id/toggle` | Status toggle button |

All mutations invalidate the `['policies']` TanStack Query cache on success, triggering an automatic list refetch.
