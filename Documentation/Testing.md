# Testing Guide

The test suite lives entirely in `tests/` at the repository root and is split into two tiers: **unit tests** (fast, no external services) and **system tests** (integration tests that hit the live API).

```
tests/
├── unit/
│   ├── go/                        # Go unit tests — JSON contract & pagination logic
│   │   ├── go.mod
│   │   ├── api_contract_test.go
│   │   └── pagination_test.go
│   └── web/                       # TypeScript unit tests — pure frontend logic
│       ├── package.json
│       ├── vitest.config.ts
│       ├── parseNlq.test.ts
│       ├── exportAuditLog.test.ts
│       └── useSortable.test.ts
└── system/
    ├── go.mod
    └── api_test.go                # End-to-end integration tests against localhost:8080
```

---

## Prerequisites

| Tool | Required for |
|---|---|
| Go ≥ 1.26 | Go unit tests, system tests |
| Node.js ≥ 20 + npm ≥ 11 | TypeScript unit tests |
| Docker + running containers | System tests only |
| Go API running on `:8080` | System tests only |

Install TypeScript test dependencies once:

```bash
cd tests/unit/web
npm install
```

---

## Running the tests

### All unit tests (no services required)

```bash
# Go unit tests
cd tests/unit/go
go test ./... -v

# TypeScript unit tests
cd tests/unit/web
npm test
```

### System tests (requires running API)

Start all services first, then:

```bash
cd tests/system
go test ./... -v -timeout 30s
```

> If Docker or the API is not running, system tests will fail immediately with a connection error. See [Local Setup & Troubleshooting](LocalSetup-Troubleshooting.md) for service startup instructions.

---

## Unit tests — Go (`tests/unit/go`)

**Module:** `github.com/nice-cx/ai-trust-center/tests/unit`  
**Runner:** `go test`  
**Requires:** nothing (no database, no network)  
**Count:** 12 tests

These tests validate the JSON API contract and pagination arithmetic. Because the Go API uses `internal/` packages (which cannot be imported from outside the module), the tests define local struct mirrors that reflect the expected wire format. Any drift between the real models and these mirrors will surface as a test failure when the API response shape changes.

### `api_contract_test.go` — 9 tests

Verifies that all API response structs serialise with the correct snake_case JSON field names that the frontend depends on. Catches regressions where a field rename in Go would silently break the TypeScript client.

| Test | What it checks |
|---|---|
| `TestAuditEvent_SnakeCaseFields` | All 13 `AuditEvent` fields present as snake_case (e.g. `event_time`, `confidence_score`) |
| `TestAuditEvent_NullModelID` | `model_id` serialises as JSON `null` when the pointer is nil |
| `TestAuditEvent_ConfidenceScoreRange` | `confidence_score` stays within `[0, 1]` across boundary values |
| `TestPolicy_SnakeCaseFields` | All 10 `Policy` fields present (including `violation_count`) |
| `TestPolicy_ValidSeverities` | Valid severity values are non-empty strings |
| `TestPolicy_EnabledToggle` | `enabled: true` and `enabled: false` both serialise correctly |
| `TestGovernanceMetrics_SnakeCaseFields` | All 5 `GovernanceMetrics` fields present |
| `TestGovernanceMetrics_TrendShape` | Trend array items each contain `date` and `score` |
| `TestModelHealth_SnakeCaseFields` | All 10 `ModelHealth` fields present |

### `pagination_test.go` — 3 tests

Validates the pagination maths used by the audit log. These are pure functions extracted from the API's page/offset logic.

| Test | What it checks |
|---|---|
| `TestTotalPages` | `ceil(total / pageSize)` across 9 boundary cases including the seeded event count (2,489 events ÷ 50 = 50 pages) |
| `TestPageOffset` | SQL `OFFSET = (page - 1) × pageSize`, with clamping for page < 1 |
| `TestPageSizeDefaults` | Default page sizes (50 for audit log, 25 for NLQ) are positive and within safe limits |

---

## Unit tests — TypeScript (`tests/unit/web`)

**Runner:** [Vitest](https://vitest.dev) v2  
**Requires:** nothing (no browser, no network, no React renderer)  
**Count:** 60 tests across 3 files  
**Path alias:** `@/` resolves to `apps/web/src/` via `vitest.config.ts`

```bash
cd tests/unit/web
npm test           # single run
npm run test:watch # watch mode during development
```

### `parseNlq.test.ts` — 27 tests

Tests the natural language query parser (`apps/web/src/lib/parseNlq.ts`) which converts plain-English questions into structured `AuditLogFilters`. Uses fake timers so date-based assertions are deterministic regardless of when the tests run.

| Group | Tests |
|---|---|
| Outcome detection | `blocked`, `block` (stem), `violation`, `flagged`, `policy`, `allowed`, `approved` |
| Event type detection | `inference`, `policy_check`, `bias_scan`, `session_start`, `model_load` |
| Time window detection | `today`, `last 24 hours`, `last 7 days`, `this week`, `last 30 days`, `this month` |
| Compound queries | Outcome + time window, event type + time window |
| Search fallback | Unrecognised query → `search` filter, original casing preserved |
| Invariants | `page` always 1, `pageSize` always 25, `source` always `"regex"`, `tags` always an array |

### `exportAuditLog.test.ts` — 18 tests

Tests the `buildSiemPayload` function (`apps/web/src/lib/exportAuditLog.ts`) which formats audit events as CEF (Common Event Format) strings for SIEM integration. The other export functions (`exportCSV`, `exportJSON`) rely on browser APIs (`Blob`, `URL.createObjectURL`) and are covered by the system tests end-to-end.

| Group | Tests |
|---|---|
| CEF format | Header starts with `CEF:0\|NICE CXone\|AI Trust Center\|1.0\|`, outcome in uppercase, event_type included |
| Severity mapping | `blocked` → `8`, `flagged` → `5`, `allowed` → `2` |
| Extension fields | `rt=` epoch ms, `suser=` agent ID, `dvc=` model name, `cs1=` session ID + label, `cs2=` confidence %, `cs3=` violations joined with `;` |
| Edge cases | Empty violations, blank agent_id/model_name (documents `??` operator behaviour), multi-event output, 5-event cap, empty input |

### `useSortable.test.ts` — 15 tests

Tests the core sorting algorithm from `apps/web/src/lib/useSortable.ts`. Because the hook uses React's `useState` and `useMemo`, the algorithm is extracted as a pure function and tested directly — no React renderer required.

| Group | Tests |
|---|---|
| No-sort passthrough | Returns original array reference when `sort` is null |
| String sorting | By `id` and `outcome`, ascending and descending |
| Numeric sorting | By `score`, ascending and descending |
| Null handling | Null values pushed to end regardless of sort direction; all-null column does not throw |
| Immutability | Original array is not mutated; a new array instance is always returned |
| Edge cases | Empty array, single-element array, equal values |

---

## System tests (`tests/system`)

**Module:** `github.com/nice-cx/ai-trust-center/tests/system`  
**Runner:** `go test`  
**Requires:** Docker services running + Go API on `:8080` + seeded data  
**Count:** 33 tests  
**Timeout:** 30 seconds (all tests complete in under 1 second against local services)

System tests make real HTTP requests to the API and assert on response status codes, JSON shapes, field values, and filter behaviour. They are the primary verification layer for the full request → handler → database → response path.

```bash
# Start services if not already running
npm run db:up
cd apps/api && make run &

# Run system tests
cd tests/system
go test ./... -v -timeout 30s
```

### Test coverage by endpoint

#### `GET /api/v1/governance/metrics`

| Test | Assertion |
|---|---|
| `TestGovernanceMetrics_Returns200` | Status 200 |
| `TestGovernanceMetrics_RequiredFields` | All 5 fields present: `governance_score`, `active_policies`, `policy_violations_24h`, `models_monitored`, `trend` |
| `TestGovernanceMetrics_ScoreInRange` | `governance_score` is a number in `[0, 100]` |
| `TestGovernanceMetrics_TrendIsNonEmptyArray` | `trend` is a non-empty array |
| `TestGovernanceMetrics_TrendPointShape` | Each trend point has `date` and `score` keys |

#### `GET /api/v1/governance/models`

| Test | Assertion |
|---|---|
| `TestGovernanceModels_Returns200` | Status 200 |
| `TestGovernanceModels_WrappedInModelsKey` | Response has top-level `models` key |
| `TestGovernanceModels_ModelShape` | Each model has: `id`, `name`, `status`, `confidence_avg`, `total_inferences`, `violation_count` |

#### `GET /api/v1/governance/alerts`

| Test | Assertion |
|---|---|
| `TestGovernanceAlerts_Returns200` | Status 200 |
| `TestGovernanceAlerts_WrappedInAlertsKey` | Response has top-level `alerts` key |
| `TestGovernanceAlerts_AlertShape` | Each alert has: `id`, `severity`, `title`, `description`, `timestamp` |
| `TestGovernanceAlerts_ValidSeverities` | Every alert severity is one of `critical`, `high`, `medium`, `low` |

#### `GET /api/v1/audit-log`

| Test | Assertion |
|---|---|
| `TestAuditLog_Returns200` | Status 200 |
| `TestAuditLog_PaginationShape` | Response has `events`, `total`, `page`, `page_size` |
| `TestAuditLog_DefaultPageSizeMax50` | Default response returns ≤ 50 events |
| `TestAuditLog_EventShape` | Each event has: `id`, `event_time`, `event_type`, `outcome`, `confidence_score`, `policy_violations` |
| `TestAuditLog_ConfidenceScoreRange` | Every `confidence_score` is in `[0, 1]` |
| `TestAuditLog_OutcomeFilter_Blocked` | `?outcome=blocked` returns only blocked events |
| `TestAuditLog_OutcomeFilter_Allowed` | `?outcome=allowed` returns only allowed events |
| `TestAuditLog_OutcomeFilter_Flagged` | `?outcome=flagged` returns only flagged events |
| `TestAuditLog_PageSizeRespected` | `?page_size=5` returns ≤ 5 events |
| `TestAuditLog_TotalIsPositive` | `total` > 0 after seeding |
| `TestAuditLog_SecondPageDifferentFromFirst` | Page 2 returns different event IDs than page 1 |

#### `GET /api/v1/policies` · `POST /api/v1/policies` · `PATCH /api/v1/policies/:id/toggle`

| Test | Assertion |
|---|---|
| `TestPolicies_List_Returns200` | Status 200 |
| `TestPolicies_List_WrappedInPoliciesKey` | Response has top-level `policies` key |
| `TestPolicies_List_PolicyShape` | Each policy has: `id`, `name`, `severity`, `enabled`, `violation_count` |
| `TestPolicies_List_ValidSeverities` | Every policy severity is one of `critical`, `high`, `medium`, `low` |
| `TestPolicies_Create_Returns201` | POST with valid body returns 201 |
| `TestPolicies_Create_ReturnsID` | Created policy response includes non-empty `id` |
| `TestPolicies_Create_MissingName_Returns400` | Missing `name` → 400 with `"name is required"` |
| `TestPolicies_Create_InvalidSeverity_Returns400` | Invalid severity → 400 with validation message |
| `TestPolicies_Toggle_Returns200` | PATCH toggle returns 200 with `{"ok": true}` |
| `TestPolicies_Toggle_InvalidBody_Returns400` | Malformed JSON body → 400 |

---

## Adding new tests

### Go unit test (contract or logic)

Add a `_test.go` file in `tests/unit/go/` with `package contract_test`. No imports beyond the Go standard library are needed.

### TypeScript unit test

Add a `.test.ts` file in `tests/unit/web/`. Import source files using paths relative to `tests/unit/web/`, e.g.:

```ts
import { myFn } from '../../../apps/web/src/lib/myFn'
```

The `@/` alias resolves to `apps/web/src/` automatically via `vitest.config.ts`.

### System test

Add test functions to `tests/system/api_test.go` (or create a new `*_test.go` file in the same package `system_test`). Use the `getJSON`, `postJSON`, and `patchJSON` helpers already defined in the file.

---

## Notes

- **System tests create real data.** `TestPolicies_Create_*` and `TestPolicies_Toggle_Returns200` insert policies into the database. They use unique timestamped names so repeated runs do not conflict, but the rows are not automatically cleaned up.
- **System tests are order-independent.** Each test is self-contained and does not depend on execution order.
- **The Go unit tests cannot import `apps/api/internal/`** due to Go's `internal` package visibility rules. In-package unit tests for the repository and handler layers live alongside their source files in `apps/api/internal/`.
