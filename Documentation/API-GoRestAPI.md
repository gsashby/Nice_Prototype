# Go REST API

The backend is a Go service (`apps/api`) built on **Fiber v2**, connected to **PostgreSQL 16** via **pgx v5**. It runs on `http://localhost:8080` by default.

All endpoints accept a `tenant_id` query parameter (defaults to the seed tenant `00000000-0000-0000-0000-000000000001`).

---

## Base URL

```
http://localhost:8080
```

---

## Endpoints

### `GET /health`

Liveness check.

**Response**
```json
{ "status": "ok", "service": "ai-trust-center-api" }
```

---

### `GET /api/v1/governance/metrics`

Returns aggregated KPI metrics for the governance dashboard.

**Query parameters**

| Param | Type | Default | Description |
|---|---|---|---|
| `tenant_id` | string | seed UUID | Scopes the query to a specific tenant |

**Response**
```json
{
  "governance_score": 87.4,
  "active_policies": 12,
  "policy_violations_24h": 3,
  "models_monitored": 5,
  "trend": [
    { "date": "Apr 07", "score": 84.2 },
    { "date": "Apr 14", "score": 86.1 }
  ]
}
```

**How it's calculated**

| Field | Source |
|---|---|
| `governance_score` | `AVG(governance_score)` across active models in `ai_models` |
| `active_policies` | `COUNT(*)` from `policies` where `enabled = true` |
| `policy_violations_24h` | `COUNT(*)` from `audit_events` in last 24h where `policy_violations` array is non-empty |
| `models_monitored` | `COUNT(*)` from `ai_models` where `status = 'active'` |
| `trend` | Weekly-bucketed average `confidence_score` from `audit_events` over last 6 weeks |

---

### `GET /api/v1/governance/models`

Returns per-model health metrics.

**Query parameters**

| Param | Type | Default | Description |
|---|---|---|---|
| `tenant_id` | string | seed UUID | Scopes the query to a specific tenant |

**Response**
```json
{
  "models": [
    {
      "id": "uuid",
      "tenant_id": "uuid",
      "name": "GPT-4o Autopilot",
      "type": "autopilot",
      "version": "2024-11",
      "status": "active",
      "governance_score": 91.2,
      "confidence_avg": 0.883,
      "total_inferences": 4821,
      "violation_count": 14,
      "bias_score": 0.0029,
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

**Notes**
- `confidence_avg`, `total_inferences`, and `violation_count` are derived from `audit_events` joined over the **last 7 days**.
- `bias_score` is computed as `violation_count / total_inferences` (simplified metric).
- Results are ordered by `governance_score DESC`.

---

### `GET /api/v1/governance/alerts`

Returns up to 20 recent governance alerts derived from audit events.

**Query parameters**

| Param | Type | Default | Description |
|---|---|---|---|
| `tenant_id` | string | seed UUID | Scopes the query to a specific tenant |

**Response**
```json
{
  "alerts": [
    {
      "id": "uuid",
      "severity": "critical",
      "title": "Action Blocked — Policy Violation",
      "description": "[inference] blocked: respond on model GPT-4o Autopilot",
      "timestamp": "2025-05-09T14:22:00Z"
    }
  ]
}
```

**Alert derivation logic**

Alerts are `audit_events` from the last 48 hours where `outcome = 'blocked'` OR `policy_violations` is non-empty.

| `outcome` | `severity` assigned |
|---|---|
| `blocked` | `critical` |
| anything else with violations | `high` |

---

### `GET /api/v1/audit-log`

Returns a paginated, filtered list of audit events. This is the most heavily used endpoint — the Audit Log Explorer, NLQ results, session timeline, and all exports call it.

**Query parameters**

| Param | Type | Default | Description |
|---|---|---|---|
| `tenant_id` | string | seed UUID | Tenant scope |
| `page` | int | `1` | Page number (1-based) |
| `page_size` | int | `50` | Results per page (clamped to max 200) |
| `start_date` | ISO 8601 string | — | Filter events on or after this date |
| `end_date` | ISO 8601 string | — | Filter events on or before this date |
| `event_type` | string | — | Exact match on `event_type` (e.g. `inference`, `policy_check`, `bias_scan`, `session_start`, `model_load`) |
| `outcome` | string | — | Exact match on `outcome` (e.g. `allowed`, `blocked`, `flagged`, `auto-applied`) |
| `model_id` | UUID string | — | Exact match on `model_id` |
| `model_name` | string | — | `ILIKE` match on the joined `ai_models.name` (e.g. `Autopilot`, `GPT-4`) |
| `event_type` | string | — | Exact match — also accepts `session_end` |
| `search` | string | — | `ILIKE` match against `action`, `agent_id`, and `session_id` |

**Response**
```json
{
  "events": [
    {
      "id": "uuid",
      "tenant_id": "uuid",
      "event_time": "2025-05-09T14:22:00Z",
      "event_type": "inference",
      "model_id": "uuid",
      "model_name": "GPT-4o Autopilot",
      "agent_id": "agent-abc123",
      "session_id": "sess-xyz789",
      "action": "respond",
      "outcome": "blocked",
      "confidence_score": 0.412,
      "policy_violations": ["bias-threshold", "pii-detected"],
      "metadata": {}
    }
  ],
  "total": 1284,
  "page": 1,
  "page_size": 50
}
```

**Notes**
- Results are always ordered `event_time DESC`.
- `page_size` values below 1 or above 200 are clamped to `50` and `200` respectively by the repository layer.
- The export feature (`exportAuditLog.ts`) calls this endpoint with `page_size=5000` to fetch a large batch for download. The 200-row server cap does not apply to that — the cap in the handler code applies only when `page_size > 200`; the export bypasses this by passing `5000` which gets clamped. In practice exports use a separate fetch path — see `Documentation/API-InternalNextJS.md`.

---

### `GET /api/v1/policies`

Returns all policies for the tenant.

**Query parameters**

| Param | Type | Default | Description |
|---|---|---|---|
| `tenant_id` | string | seed UUID | Tenant scope |

**Response**
```json
{
  "policies": [
    {
      "id": "uuid",
      "tenant_id": "uuid",
      "name": "PII Detection Block",
      "description": "Blocks responses containing detected PII",
      "severity": "critical",
      "enabled": true,
      "rule_config": {},
      "violation_count": 7,
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

---

### `POST /api/v1/policies`

Creates a new policy.

**Request body**
```json
{
  "name": "Bias Threshold Alert",
  "description": "Flags events where bias score exceeds threshold",
  "severity": "high",
  "enabled": true,
  "rule_config": {}
}
```

**Validation**
- `name` is required.
- `severity` must be one of `critical`, `high`, `medium`, `low`.

**Response** — `201 Created`
```json
{
  "id": "uuid",
  "name": "Bias Threshold Alert",
  ...
}
```

---

### `PATCH /api/v1/policies/:id/toggle`

Enables or disables a policy.

**URL parameter**
- `:id` — the policy UUID

**Query parameters**

| Param | Type | Default | Description |
|---|---|---|---|
| `tenant_id` | string | seed UUID | Tenant scope |

**Request body**
```json
{ "enabled": false }
```

**Response**
```json
{ "ok": true }
```

---

## Error responses

All endpoints return errors in the same shape:

```json
{ "error": "description of the problem" }
```

| Status | Meaning |
|---|---|
| `400` | Bad request — missing or invalid field |
| `500` | Internal server error — database or query failure |

---

## Tech stack

| Component | Library |
|---|---|
| HTTP framework | [Fiber v2](https://github.com/gofiber/fiber) |
| Database driver | [pgx v5](https://github.com/jackc/pgx) |
| CORS | Fiber built-in middleware |
| Logging | Fiber built-in logger middleware |
| Config | `godotenv` + `os.Getenv` |
