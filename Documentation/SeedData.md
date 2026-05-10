# Seed Data

The prototype uses three layers of seed data applied in sequence. Together they populate a realistic demo environment for the Acme Corp Demo tenant.

---

## Overview

| Layer | File | When it runs | What it adds |
|---|---|---|---|
| **1 — Schema + base seed** | `infra/docker/init/01_extensions.sql` | Automatically on first `db:up` | Tables, indexes, extensions, seed tenant |
| **2 — Static demo seed** | `infra/docker/init/02_seed.sql` | Automatically on first `db:up` | Models, policies, 40 recent spot events |
| **3 — Historical audit seed** | `apps/api/cmd/seed/main.go` | Manual — `make seed` | 42 days of time-series audit events (~2,500 rows) |
| **4 — Alert demo seed** | `infra/docker/seed_alerts.sql` | Manual — see below | 20 targeted blocked/flagged events in the last 48 hours |

---

## Fixed demo identifiers

All seed data uses fixed UUIDs so data relationships are consistent across resets.

**Tenant**

| ID | Name |
|---|---|
| `00000000-0000-0000-0000-000000000001` | Acme Corp Demo |

**AI Models**

| ID suffix | Name | Type | Version | Status | Gov. Score |
|---|---|---|---|---|---|
| `...000000000001` | CXone Virtual Agent v3 | LLM | 3.2.1 | active | 96.2 |
| `...000000000002` | Sentiment Analyzer Pro | Classifier | 2.4.0 | active | 78.4 |
| `...000000000003` | Intent Router | Classifier | 1.8.5 | active | 94.1 |
| `...000000000004` | Copilot Assistant | LLM | 1.0.3 | active | 62.0 |
| `...000000000005` | Knowledge Retrieval Engine | RAG | 4.1.0 | active | 91.7 |
| `...000000000006` | Forecasting Model v2 | Regression | 2.0.0 | inactive | 85.3 |

Full model ID prefix: `11111111-1111-1111-1111-`

**Copilot Assistant** (model 4) is intentionally the lowest-scoring model — it generates disproportionately more blocked and flagged events to make violations visible in the dashboard.

---

## Layer 1 — Schema + base seed (`01_extensions.sql`)

**Runs:** automatically when Docker Compose starts for the first time (`npm run db:up`). Docker Compose mounts the `infra/docker/init/` directory as the PostgreSQL init directory — all `*.sql` files are executed in filename order on a fresh volume.

**What it creates:**

- PostgreSQL extensions: `uuid-ossp`, `vector`, `timescaledb`
- Tables: `tenants`, `ai_models`, `policies`, `audit_events`
- TimescaleDB hypertable on `audit_events` partitioned by `event_time`
- Indexes: `(tenant_id, event_time DESC)`, `(model_id, event_time DESC)`, `(event_type, event_time DESC)`
- The seed tenant row

**Re-run:** only runs on an empty volume. Use `npm run db:reset` to wipe and re-apply.

---

## Layer 2 — Static demo seed (`02_seed.sql`)

**Runs:** automatically alongside Layer 1 on first `db:up`.

**What it inserts:**

- 6 AI models (all with fixed UUIDs — see table above)
- 8 governance policies (see Policies section below)
- 40 spot audit events covering the last 2 hours via `generate_series` — provides immediate data for the UI before the historical seed is run

All inserts use `ON CONFLICT DO NOTHING` so re-running is safe.

---

## Layer 3 — Historical audit seed (`apps/api/cmd/seed/main.go`)

**Run command:**
```bash
cd apps/api
make seed
```

Or directly:
```bash
cd apps/api
go run ./cmd/seed/main.go
```

**What it inserts:**

- Re-upserts all 6 AI models and 8 policies (safe to re-run)
- ~2,500 audit events spread across the last 42 days (6 weeks)
- 30–90 events per day, weighted toward business hours (09:00–17:00 UTC)
- Events distributed across all 6 models, 20 agent IDs (`agent-001` to `agent-020`), and random session IDs

**Outcome distribution per model:**

| Model | Blocked | Flagged | Allowed |
|---|---|---|---|
| Copilot Assistant | ~15% | ~20% | ~65% |
| Sentiment Analyzer Pro | ~5% | ~15% | ~80% |
| All other models | ~2% | ~4% | ~94% |

**Confidence score ranges:**

| Model | Base confidence | Notes |
|---|---|---|
| CXone Virtual Agent v3 | 0.91 ±0.07 | High — flagship model |
| Sentiment Analyzer Pro | 0.79 ±0.12 | Moderate — visible on Watch status |
| Intent Router | 0.93 ±0.05 | High — well-governed |
| Copilot Assistant | 0.62 ±0.18 | Low — drives most violations |
| Knowledge Retrieval Engine | 0.88 ±0.08 | High |
| Forecasting Model v2 | 0.82 ±0.10 | Inactive — historical data only |

Blocked events have their confidence reduced by −0.20; flagged events by −0.10.

**Metadata per event** includes `latency_ms` (50–850ms), `token_count` (100–1,600), `region` (us-east-1, us-west-2, eu-west-1), and `channel` (voice, chat, email, sms).

The random seed is fixed (`rand.NewSource(42)`) for the inner loop, making the historical data reproducible across re-seeds.

---

## Layer 4 — Alert demo seed (`infra/docker/seed_alerts.sql`)

**Run command:**
```bash
docker cp infra/docker/seed_alerts.sql aitc_postgres:/tmp/seed_alerts.sql
docker exec aitc_postgres psql -U postgres -d ai_trust_center -f /tmp/seed_alerts.sql
```

This layer inserts 20 targeted audit events into the last 48 hours specifically to populate the Governance Dashboard Alert Feed with realistic, varied alerts. Without this layer the alert feed may be empty if the Go historical seed has not generated recent violations.

**What it inserts — 10 blocked (critical) events:**

| Time ago | Model | Event type | Policy violations |
|---|---|---|---|
| 12 min | Copilot Assistant | inference | Confidence Floor |
| 38 min | Copilot Assistant | inference | PII Redaction, Content Safety |
| 1h 14m | Sentiment Analyzer Pro | inference | Content Safety |
| 2h 5m | Copilot Assistant | bias_scan | Bias Threshold, Confidence Floor |
| 3h 42m | Copilot Assistant | model_load | Model Version Pin, Confidence Floor |
| 5h 20m | Knowledge Retrieval Engine | inference | Data Residency |
| 7h 3m | CXone Virtual Agent v3 | inference | Content Safety |
| 9h 55m | Intent Router | inference | Confidence Floor |
| 14h 18m | Copilot Assistant | policy_check | Audit Completeness, Confidence Floor |
| 19h 30m | Copilot Assistant | inference | PII Redaction |

**10 flagged (high) events:**

| Time ago | Model | Event type | Policy violations |
|---|---|---|---|
| 22 min | Copilot Assistant | bias_scan | Bias Threshold |
| 55 min | CXone Virtual Agent v3 | session_start | Session Length Limit |
| 1h 40m | Sentiment Analyzer Pro | inference | Confidence Floor |
| 2h 50m | Knowledge Retrieval Engine | inference | Audit Completeness |
| 4h 10m | Intent Router | inference | Confidence Floor |
| 6h 22m | Copilot Assistant | policy_check | Bias Threshold, Session Length Limit |
| 8h 45m | CXone Virtual Agent v3 | inference | Content Safety |
| 11h 8m | Sentiment Analyzer Pro | inference | Bias Threshold |
| 16h 35m | Copilot Assistant | inference | PII Redaction |
| 23h 10m | Intent Router | model_load | Model Version Pin |

All 20 rows use session IDs prefixed `sess-alert-` so they can be identified and cleaned up if needed:
```sql
DELETE FROM audit_events WHERE session_id LIKE 'sess-alert-%';
```

**Note:** Because the alert feed queries `event_time >= NOW() - INTERVAL '48 hours'`, these events expire naturally after 48 hours. Re-run the seed whenever you need to repopulate the alert feed.

---

## Policies

8 policies are seeded. All use `ON CONFLICT DO NOTHING` so they are not duplicated on re-seed. Additional policies created through the Policy Engine UI are preserved across re-seeds.

| Name | Severity | Enabled | Purpose |
|---|---|---|---|
| Confidence Floor | critical | ✓ | Block responses with confidence < 70% |
| Bias Threshold | high | ✓ | Flag models with violation rate > 10% in 24h |
| Content Safety | critical | ✓ | Block hate speech, self-harm, violence |
| PII Redaction | high | ✓ | Ensure PII fields are redacted before logging |
| Data Residency | medium | ✗ | Enforce approved geographic regions (disabled) |
| Session Length Limit | medium | ✓ | Alert on sessions longer than 60 minutes |
| Audit Completeness | high | ✓ | Require all audit events have complete fields |
| Model Version Pin | medium | ✓ | Prevent unapproved model versions |

---

## Full reset and reseed

To wipe all data and start fresh:

```bash
# 1. Stop and remove Docker volumes
npm run db:reset

# 2. Start fresh (runs Layer 1 + 2 automatically)
npm run db:up

# 3. Run the Go historical seed (Layer 3)
cd apps/api && make seed

# 4. Populate the alert feed (Layer 4)
cd ../..
docker cp infra/docker/seed_alerts.sql aitc_postgres:/tmp/seed_alerts.sql
docker exec aitc_postgres psql -U postgres -d ai_trust_center -f /tmp/seed_alerts.sql
```

After these steps the database will contain:

| Table | Rows |
|---|---|
| tenants | 1 |
| ai_models | 6 |
| policies | 8+ (+ any created in UI) |
| audit_events | ~2,560 (2,500 historical + 40 spot + 20 alerts) |

---

## Querying seed data directly

Connect to the database via Docker:
```bash
docker exec -it aitc_postgres psql -U postgres -d ai_trust_center
```

Useful spot-checks:
```sql
-- Alert feed preview (what the dashboard shows)
SELECT ae.outcome, ae.event_type, m.name, ae.policy_violations, ae.event_time
FROM audit_events ae
LEFT JOIN ai_models m ON m.id = ae.model_id
WHERE ae.tenant_id = '00000000-0000-0000-0000-000000000001'
  AND (ae.outcome = 'blocked' OR jsonb_array_length(ae.policy_violations) > 0)
  AND ae.event_time >= NOW() - INTERVAL '48 hours'
ORDER BY ae.event_time DESC;

-- Per-model violation counts (last 7 days)
SELECT m.name, COUNT(*) FILTER (WHERE ae.outcome = 'blocked') AS blocked,
       COUNT(*) FILTER (WHERE ae.outcome = 'flagged') AS flagged
FROM audit_events ae
JOIN ai_models m ON m.id = ae.model_id
WHERE ae.event_time >= NOW() - INTERVAL '7 days'
GROUP BY m.name ORDER BY blocked DESC;

-- Daily event volume
SELECT DATE(event_time) AS day, COUNT(*) AS events
FROM audit_events
WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
GROUP BY day ORDER BY day DESC LIMIT 14;
```
