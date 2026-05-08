-- Demo seed data — loaded automatically on first docker compose up.
-- The Go seed tool (make seed) inserts richer time-series audit data on top of this.

-- ── Tenant ────────────────────────────────────────────────────────────────
INSERT INTO tenants (id, name) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Acme Corp Demo')
ON CONFLICT DO NOTHING;

-- ── AI Models ─────────────────────────────────────────────────────────────
INSERT INTO ai_models (id, tenant_id, name, type, version, status, governance_score, created_at, updated_at) VALUES
    ('11111111-1111-1111-1111-000000000001', '00000000-0000-0000-0000-000000000001', 'CXone Virtual Agent v3',     'LLM',        '3.2.1', 'active',   96.2, NOW() - INTERVAL '90 days', NOW()),
    ('11111111-1111-1111-1111-000000000002', '00000000-0000-0000-0000-000000000001', 'Sentiment Analyzer Pro',     'Classifier', '2.4.0', 'active',   78.4, NOW() - INTERVAL '90 days', NOW()),
    ('11111111-1111-1111-1111-000000000003', '00000000-0000-0000-0000-000000000001', 'Intent Router',              'Classifier', '1.8.5', 'active',   94.1, NOW() - INTERVAL '90 days', NOW()),
    ('11111111-1111-1111-1111-000000000004', '00000000-0000-0000-0000-000000000001', 'Copilot Assistant',          'LLM',        '1.0.3', 'active',   62.0, NOW() - INTERVAL '90 days', NOW()),
    ('11111111-1111-1111-1111-000000000005', '00000000-0000-0000-0000-000000000001', 'Knowledge Retrieval Engine', 'RAG',        '4.1.0', 'active',   91.7, NOW() - INTERVAL '90 days', NOW()),
    ('11111111-1111-1111-1111-000000000006', '00000000-0000-0000-0000-000000000001', 'Forecasting Model v2',       'Regression', '2.0.0', 'inactive', 85.3, NOW() - INTERVAL '90 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- ── Policies ──────────────────────────────────────────────────────────────
INSERT INTO policies (tenant_id, name, description, severity, enabled, rule_config, created_at, updated_at) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Confidence Floor',    'Block AI responses with confidence score below 70%',                       'critical', true,  '{"threshold": 0.70, "action": "block"}',                                     NOW() - INTERVAL '60 days', NOW()),
    ('00000000-0000-0000-0000-000000000001', 'Bias Threshold',      'Flag models where violation rate exceeds 10% in a 24-hour window',         'high',     true,  '{"max_violation_rate": 0.10, "window_hours": 24}',                           NOW() - INTERVAL '60 days', NOW()),
    ('00000000-0000-0000-0000-000000000001', 'Content Safety',      'Block responses containing harmful or sensitive content',                  'critical', true,  '{"categories": ["hate_speech","self_harm","violence"], "action": "block"}',  NOW() - INTERVAL '60 days', NOW()),
    ('00000000-0000-0000-0000-000000000001', 'PII Redaction',       'Ensure PII is redacted before logging',                                    'high',     true,  '{"fields": ["email","phone","ssn","credit_card"]}',                         NOW() - INTERVAL '60 days', NOW()),
    ('00000000-0000-0000-0000-000000000001', 'Data Residency',      'Ensure all AI inference stays within approved geographic regions',         'medium',   false, '{"allowed_regions": ["us-east-1","eu-west-1"]}',                            NOW() - INTERVAL '60 days', NOW()),
    ('00000000-0000-0000-0000-000000000001', 'Session Length Limit','Alert when an AI session exceeds 60 minutes of continuous usage',          'medium',   true,  '{"max_minutes": 60, "action": "alert"}',                                    NOW() - INTERVAL '60 days', NOW()),
    ('00000000-0000-0000-0000-000000000001', 'Audit Completeness',  'Require all AI decisions to have a complete audit trail entry',            'high',     true,  '{"required_fields": ["model_id","session_id","confidence_score"]}',         NOW() - INTERVAL '60 days', NOW()),
    ('00000000-0000-0000-0000-000000000001', 'Model Version Pin',   'Prevent deployment of AI model versions not on the approved list',         'medium',   true,  '{"approved_versions": ["3.2.1","2.4.0","1.8.5","4.1.0"]}',                 NOW() - INTERVAL '60 days', NOW())
ON CONFLICT DO NOTHING;

-- ── Spot audit events (recent — last 2 hours) for immediate UI testing ────
-- The Go seed tool adds 42 days of richer historical data on top of this.
INSERT INTO audit_events (tenant_id, event_time, event_type, model_id, agent_id, session_id, action, outcome, confidence_score, policy_violations, metadata)
SELECT
    '00000000-0000-0000-0000-000000000001',
    NOW() - (n * INTERVAL '3 minutes'),
    (ARRAY['inference','policy_check','session_start','bias_scan'])[1 + (n % 4)],
    (ARRAY[
        '11111111-1111-1111-1111-000000000001',
        '11111111-1111-1111-1111-000000000002',
        '11111111-1111-1111-1111-000000000003',
        '11111111-1111-1111-1111-000000000004'
    ])[1 + (n % 4)]::uuid,
    'agent-' || LPAD((n % 10 + 1)::text, 3, '0'),
    'sess-' || LPAD(n::text, 8, '0'),
    (ARRAY['generate_response','classify_intent','detect_sentiment','suggest_reply'])[1 + (n % 4)],
    CASE
        WHEN n % 20 = 0 THEN 'blocked'
        WHEN n % 7  = 0 THEN 'flagged'
        ELSE 'allowed'
    END,
    CASE
        WHEN n % 20 = 0 THEN 0.45 + (n % 10) * 0.02
        WHEN n % 7  = 0 THEN 0.65 + (n % 10) * 0.01
        ELSE               0.80 + (n % 15) * 0.01
    END,
    CASE
        WHEN n % 20 = 0 THEN '["Confidence Floor"]'::jsonb
        WHEN n % 7  = 0 THEN '["Bias Threshold"]'::jsonb
        ELSE '[]'::jsonb
    END,
    jsonb_build_object('latency_ms', 100 + n * 7, 'channel', (ARRAY['voice','chat','email'])[1 + (n % 3)])
FROM generate_series(1, 40) AS n;
