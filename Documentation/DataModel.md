# Data Model

All data lives in **PostgreSQL 16 with TimescaleDB**. The schema is defined in `infra/docker/init/01_extensions.sql` and loaded automatically on first `docker compose up`.

---

## Extensions

| Extension | Purpose |
|---|---|
| `uuid-ossp` | `uuid_generate_v4()` for primary keys |
| `timescaledb` | Hypertable partitioning on `audit_events` |
| `vector` | pgvector — installed but not yet used |

---

## Entity relationship

```
tenants
  │
  ├── ai_models (tenant_id FK)
  │
  ├── policies (tenant_id FK)
  │
  └── audit_events (tenant_id FK, model_id FK → ai_models)
```

---

## Tables

### `tenants`

The top-level multi-tenancy boundary. All other tables are scoped by `tenant_id`.

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` PK | `uuid_generate_v4()` default |
| `name` | `TEXT` | Display name |
| `created_at` | `TIMESTAMPTZ` | Defaults to `NOW()` |

**Seed value:** `00000000-0000-0000-0000-000000000001` / `"Acme Corp Demo"`

---

### `ai_models`

Represents an AI model deployment being monitored. One model can have many audit events.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` PK | `uuid_generate_v4()` | |
| `tenant_id` | `UUID` | FK → `tenants(id)` | |
| `name` | `TEXT` | NOT NULL | Human-readable model name |
| `type` | `TEXT` | NOT NULL | e.g. `LLM`, `Classifier`, `RAG`, `Regression` |
| `version` | `TEXT` | | Semantic version string |
| `status` | `TEXT` | Default `'active'` | `active` or `inactive` |
| `governance_score` | `DECIMAL(5,2)` | | Static score set at model registration — 0–100 |
| `created_at` | `TIMESTAMPTZ` | | |
| `updated_at` | `TIMESTAMPTZ` | | |

**Seed models:**

| Name | Type | Version | Score | Status |
|---|---|---|---|---|
| CXone Virtual Agent v3 | LLM | 3.2.1 | 96.2 | active |
| Sentiment Analyzer Pro | Classifier | 2.4.0 | 78.4 | active |
| Intent Router | Classifier | 1.8.5 | 94.1 | active |
| Copilot Assistant | LLM | 1.0.3 | 62.0 | active |
| Knowledge Retrieval Engine | RAG | 4.1.0 | 91.7 | active |
| Forecasting Model v2 | Regression | 2.0.0 | 85.3 | inactive |

---

### `policies`

Governance rules that define what constitutes a violation. The API enforces these in name only — the `rule_config` JSONB is stored but not yet evaluated at event ingestion time.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` PK | `uuid_generate_v4()` | |
| `tenant_id` | `UUID` | FK → `tenants(id)` | |
| `name` | `TEXT` | NOT NULL | |
| `description` | `TEXT` | | |
| `severity` | `TEXT` | CHECK: `critical`, `high`, `medium`, `low` | |
| `enabled` | `BOOLEAN` | Default `true` | Toggled by `PATCH /api/v1/policies/:id/toggle` |
| `rule_config` | `JSONB` | | Policy parameters — see examples below |
| `created_at` | `TIMESTAMPTZ` | | |
| `updated_at` | `TIMESTAMPTZ` | | |

**Seed policies and their `rule_config`:**

| Policy | Severity | Enabled | `rule_config` |
|---|---|---|---|
| Confidence Floor | critical | ✓ | `{"threshold": 0.70, "action": "block"}` |
| Bias Threshold | high | ✓ | `{"max_violation_rate": 0.10, "window_hours": 24}` |
| Content Safety | critical | ✓ | `{"categories": ["hate_speech","self_harm","violence"], "action": "block"}` |
| PII Redaction | high | ✓ | `{"fields": ["email","phone","ssn","credit_card"]}` |
| Data Residency | medium | ✗ | `{"allowed_regions": ["us-east-1","eu-west-1"]}` |
| Session Length Limit | medium | ✓ | `{"max_minutes": 60, "action": "alert"}` |
| Audit Completeness | high | ✓ | `{"required_fields": ["model_id","session_id","confidence_score"]}` |
| Model Version Pin | medium | ✓ | `{"approved_versions": ["3.2.1","2.4.0","1.8.5","4.1.0"]}` |

---

### `audit_events`

The core time-series table. Every AI decision — inference, policy check, bias scan, session event — is a row here. This is a **TimescaleDB hypertable** partitioned by `event_time`.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | PK (composite with `event_time`) | `uuid_generate_v4()` |
| `event_time` | `TIMESTAMPTZ` | PK (composite with `id`), NOT NULL | Hypertable partition key |
| `tenant_id` | `UUID` | FK → `tenants(id)` | |
| `event_type` | `TEXT` | NOT NULL | See enum values below |
| `model_id` | `UUID` | FK → `ai_models(id)` | Nullable |
| `agent_id` | `TEXT` | | e.g. `"agent-001"` |
| `session_id` | `TEXT` | | Groups related events; used for session timeline |
| `action` | `TEXT` | | What the AI did — e.g. `"generate_response"` |
| `outcome` | `TEXT` | | See enum values below |
| `confidence_score` | `DECIMAL(4,3)` | | 0.000–0.999 |
| `policy_violations` | `JSONB` | Default `'[]'` | Array of policy name strings |
| `metadata` | `JSONB` | Default `'{}'` | Arbitrary event metadata |

**`event_type` values (seeded):**

| Value | Meaning |
|---|---|
| `inference` | Model produced an output |
| `policy_check` | Policy evaluation ran against an event |
| `session_start` | New conversation session opened |
| `session_end` | Session closed |
| `model_load` | Model loaded into serving infrastructure |
| `bias_scan` | Bias detection ran against model output |

**`outcome` values:**

| Value | Meaning |
|---|---|
| `allowed` | Decision passed all checks |
| `blocked` | Decision stopped by a policy |
| `flagged` | Decision allowed but marked for review |
| `auto-applied` | Policy applied a correction automatically |

**Indexes:**

| Index | Columns | Purpose |
|---|---|---|
| `idx_audit_events_tenant_time` | `(tenant_id, event_time DESC)` | Primary list query |
| `idx_audit_events_model` | `(model_id, event_time DESC)` | Model health join |
| `idx_audit_events_type` | `(event_type, event_time DESC)` | Event type filter |

**Composite primary key:** `(id, event_time)` — required by TimescaleDB for hypertable partitioning.

---

## Seed data volumes

The schema init (`02_seed.sql`) inserts 40 spot events (last 2 hours) on first container start.

The Go seed tool (`make seed` in `apps/api`) inserts the full demo dataset on top:

| Table | Seeded count |
|---|---|
| `tenants` | 1 |
| `ai_models` | 6 |
| `policies` | 8 |
| `audit_events` | ~1,800–3,000 (42 days × 30–90 events/day) |

The Go seed tool uses a fixed random seed (`rand.NewSource(42)`) so event IDs and patterns are deterministic. It generates events weighted toward business hours (60% between 09:00–17:00 UTC) and biases violations toward the two lower-scoring models (Copilot Assistant and Sentiment Analyzer Pro).

---

## `metadata` JSONB structure

The seed populates `metadata` with four fields. This is not enforced by a schema constraint — it is convention only.

```json
{
  "latency_ms": 312,
  "token_count": 847,
  "region": "us-east-1",
  "channel": "chat"
}
```

| Field | Type | Values |
|---|---|---|
| `latency_ms` | integer | 50–849 |
| `token_count` | integer | 100–1599 |
| `region` | string | `us-east-1`, `us-west-2`, `eu-west-1` |
| `channel` | string | `voice`, `chat`, `email`, `sms` |

---

## How the API queries this data

The audit log query in `AuditRepo.List` builds dynamic WHERE clauses using positional parameters (`$1`, `$2`, …) to avoid SQL injection. The `search` filter runs an `ILIKE` match against `action`, `agent_id`, and `session_id`:

```sql
(ae.action ILIKE $n OR ae.agent_id ILIKE $n OR ae.session_id ILIKE $n)
```

The session timeline in the `AuditLogDrawer` exploits this: passing `search: session_id` returns all events where `session_id` contains that value — effectively all events in the same session.

The governance score chart uses a weekly bucket query:

```sql
SELECT to_char(date_trunc('week', event_time), 'Mon DD') AS week,
       ROUND(AVG(confidence_score) * 100, 1) AS score
FROM audit_events
WHERE tenant_id = $1
  AND event_time >= NOW() - INTERVAL '6 weeks'
GROUP BY date_trunc('week', event_time)
ORDER BY date_trunc('week', event_time)
```

Alerts are derived by querying `audit_events` for the last 48 hours where `outcome = 'blocked'` OR `jsonb_array_length(policy_violations) > 0`. No separate alerts table exists.
