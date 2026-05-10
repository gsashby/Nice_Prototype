-- seed_alerts.sql — inserts realistic blocked/flagged audit events into the last
-- 48 hours so the Governance Dashboard Alert Feed shows meaningful demo data.
-- Safe to re-run: uses unique session IDs so no conflicts.

SET search_path TO public;

DO $$
DECLARE
  t_id  UUID := '00000000-0000-0000-0000-000000000001';
  -- model UUIDs
  m_va  UUID := '11111111-1111-1111-1111-000000000001'; -- CXone Virtual Agent v3
  m_sa  UUID := '11111111-1111-1111-1111-000000000002'; -- Sentiment Analyzer Pro
  m_ir  UUID := '11111111-1111-1111-1111-000000000003'; -- Intent Router
  m_ca  UUID := '11111111-1111-1111-1111-000000000004'; -- Copilot Assistant (low score)
  m_kr  UUID := '11111111-1111-1111-1111-000000000005'; -- Knowledge Retrieval Engine
BEGIN

-- ── CRITICAL — Blocked events (outcome = 'blocked') ──────────────────────────

INSERT INTO audit_events
  (tenant_id, event_time, event_type, model_id, agent_id, session_id,
   action, outcome, confidence_score, policy_violations, metadata)
VALUES

-- 1. Low-confidence inference blocked on Copilot
(t_id, NOW() - INTERVAL '12 minutes', 'inference', m_ca, 'agent-007', 'sess-alert-001',
 'generate_response', 'blocked', 0.41,
 '["Confidence Floor"]'::jsonb,
 '{"latency_ms":310,"token_count":842,"region":"us-east-1","channel":"chat"}'::jsonb),

-- 2. PII detected in Copilot response
(t_id, NOW() - INTERVAL '38 minutes', 'inference', m_ca, 'agent-012', 'sess-alert-002',
 'suggest_reply', 'blocked', 0.67,
 '["PII Redaction","Content Safety"]'::jsonb,
 '{"latency_ms":520,"token_count":1203,"region":"eu-west-1","channel":"chat","pii_types":["email","phone"]}'::jsonb),

-- 3. Hate speech detected in Sentiment Analyzer output
(t_id, NOW() - INTERVAL '1 hour 14 minutes', 'inference', m_sa, 'agent-003', 'sess-alert-003',
 'detect_sentiment', 'blocked', 0.55,
 '["Content Safety"]'::jsonb,
 '{"latency_ms":198,"token_count":634,"region":"us-east-1","channel":"voice","content_category":"hate_speech"}'::jsonb),

-- 4. Bias threshold exceeded on Copilot — repeat offender model
(t_id, NOW() - INTERVAL '2 hours 5 minutes', 'bias_scan', m_ca, 'agent-019', 'sess-alert-004',
 'evaluate_compliance', 'blocked', 0.38,
 '["Bias Threshold","Confidence Floor"]'::jsonb,
 '{"latency_ms":145,"token_count":0,"region":"us-east-1","channel":"chat","bias_axis":"age"}'::jsonb),

-- 5. Unapproved model version rejected
(t_id, NOW() - INTERVAL '3 hours 42 minutes', 'model_load', m_ca, 'agent-001', 'sess-alert-005',
 'route_conversation', 'blocked', 0.29,
 '["Model Version Pin","Confidence Floor"]'::jsonb,
 '{"latency_ms":88,"token_count":0,"region":"us-west-2","channel":"sms","attempted_version":"1.0.3-beta"}'::jsonb),

-- 6. Knowledge retrieval blocked — data residency violation
(t_id, NOW() - INTERVAL '5 hours 20 minutes', 'inference', m_kr, 'agent-008', 'sess-alert-006',
 'retrieve_knowledge', 'blocked', 0.61,
 '["Data Residency"]'::jsonb,
 '{"latency_ms":440,"token_count":1890,"region":"ap-southeast-1","channel":"chat"}'::jsonb),

-- 7. Self-harm content blocked on Virtual Agent
(t_id, NOW() - INTERVAL '7 hours 3 minutes', 'inference', m_va, 'agent-015', 'sess-alert-007',
 'generate_response', 'blocked', 0.72,
 '["Content Safety"]'::jsonb,
 '{"latency_ms":390,"token_count":956,"region":"eu-west-1","channel":"voice","content_category":"self_harm"}'::jsonb),

-- 8. Intent Router confidence collapse — service degradation
(t_id, NOW() - INTERVAL '9 hours 55 minutes', 'inference', m_ir, 'agent-004', 'sess-alert-008',
 'classify_intent', 'blocked', 0.34,
 '["Confidence Floor"]'::jsonb,
 '{"latency_ms":712,"token_count":278,"region":"us-east-1","channel":"email"}'::jsonb),

-- 9. Audit completeness failure — missing required fields
(t_id, NOW() - INTERVAL '14 hours 18 minutes', 'policy_check', m_ca, 'agent-011', 'sess-alert-009',
 'evaluate_compliance', 'blocked', 0.44,
 '["Audit Completeness","Confidence Floor"]'::jsonb,
 '{"latency_ms":62,"token_count":0,"region":"us-east-1","channel":"chat","missing_fields":["session_id"]}'::jsonb),

-- 10. Copilot PII exposure in transcript summary
(t_id, NOW() - INTERVAL '19 hours 30 minutes', 'inference', m_ca, 'agent-006', 'sess-alert-010',
 'summarize_transcript', 'blocked', 0.58,
 '["PII Redaction"]'::jsonb,
 '{"latency_ms":830,"token_count":2140,"region":"eu-west-1","channel":"email","pii_types":["ssn","credit_card"]}'::jsonb),

-- ── HIGH — Flagged events (outcome = 'flagged') ───────────────────────────────

-- 11. Copilot bias scan warning
(t_id, NOW() - INTERVAL '22 minutes', 'bias_scan', m_ca, 'agent-009', 'sess-alert-011',
 'evaluate_compliance', 'flagged', 0.63,
 '["Bias Threshold"]'::jsonb,
 '{"latency_ms":190,"token_count":0,"region":"us-east-1","channel":"chat","bias_axis":"gender","violation_rate":0.08}'::jsonb),

-- 12. Long session warning on Virtual Agent
(t_id, NOW() - INTERVAL '55 minutes', 'session_start', m_va, 'agent-002', 'sess-alert-012',
 'generate_response', 'flagged', 0.84,
 '["Session Length Limit"]'::jsonb,
 '{"latency_ms":245,"token_count":3820,"region":"us-east-1","channel":"voice","session_minutes":73}'::jsonb),

-- 13. Sentiment Analyzer moderate confidence + policy flag
(t_id, NOW() - INTERVAL '1 hour 40 minutes', 'inference', m_sa, 'agent-017', 'sess-alert-013',
 'detect_sentiment', 'flagged', 0.69,
 '["Confidence Floor"]'::jsonb,
 '{"latency_ms":155,"token_count":421,"region":"us-west-2","channel":"sms"}'::jsonb),

-- 14. Knowledge retrieval latency spike flagged
(t_id, NOW() - INTERVAL '2 hours 50 minutes', 'inference', m_kr, 'agent-013', 'sess-alert-014',
 'retrieve_knowledge', 'flagged', 0.78,
 '["Audit Completeness"]'::jsonb,
 '{"latency_ms":4120,"token_count":1650,"region":"eu-west-1","channel":"chat","latency_spike":true}'::jsonb),

-- 15. Intent Router near-miss confidence — borderline flagged
(t_id, NOW() - INTERVAL '4 hours 10 minutes', 'inference', m_ir, 'agent-005', 'sess-alert-015',
 'classify_intent', 'flagged', 0.71,
 '["Confidence Floor"]'::jsonb,
 '{"latency_ms":310,"token_count":387,"region":"us-east-1","channel":"voice"}'::jsonb),

-- 16. Copilot policy check escalation
(t_id, NOW() - INTERVAL '6 hours 22 minutes', 'policy_check', m_ca, 'agent-016', 'sess-alert-016',
 'evaluate_compliance', 'flagged', 0.54,
 '["Bias Threshold","Session Length Limit"]'::jsonb,
 '{"latency_ms":78,"token_count":0,"region":"us-east-1","channel":"chat"}'::jsonb),

-- 17. Virtual Agent unusual output pattern
(t_id, NOW() - INTERVAL '8 hours 45 minutes', 'inference', m_va, 'agent-010', 'sess-alert-017',
 'generate_response', 'flagged', 0.76,
 '["Content Safety"]'::jsonb,
 '{"latency_ms":420,"token_count":1120,"region":"eu-west-1","channel":"chat","content_category":"violence"}'::jsonb),

-- 18. Sentiment misclassification flagged
(t_id, NOW() - INTERVAL '11 hours 8 minutes', 'inference', m_sa, 'agent-018', 'sess-alert-018',
 'detect_sentiment', 'flagged', 0.66,
 '["Bias Threshold"]'::jsonb,
 '{"latency_ms":167,"token_count":298,"region":"us-west-2","channel":"email","bias_axis":"language"}'::jsonb),

-- 19. Copilot knowledge retrieval near-PII exposure
(t_id, NOW() - INTERVAL '16 hours 35 minutes', 'inference', m_ca, 'agent-014', 'sess-alert-019',
 'retrieve_knowledge', 'flagged', 0.62,
 '["PII Redaction"]'::jsonb,
 '{"latency_ms":950,"token_count":1730,"region":"eu-west-1","channel":"chat"}'::jsonb),

-- 20. Intent Router model version drift detected
(t_id, NOW() - INTERVAL '23 hours 10 minutes', 'model_load', m_ir, 'agent-020', 'sess-alert-020',
 'route_conversation', 'flagged', 0.81,
 '["Model Version Pin"]'::jsonb,
 '{"latency_ms":110,"token_count":0,"region":"us-east-1","channel":"sms","detected_version":"1.8.5-rc"}'::jsonb);

RAISE NOTICE 'Inserted 20 demo alert events (10 blocked, 10 flagged) into the last 48 hours.';
END $$;
