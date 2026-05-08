-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "timescaledb";

-- Core governance tables
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    version TEXT,
    status TEXT DEFAULT 'active',
    governance_score DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    name TEXT NOT NULL,
    description TEXT,
    severity TEXT CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    enabled BOOLEAN DEFAULT true,
    rule_config JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hypertable for time-series audit events (TimescaleDB)
CREATE TABLE IF NOT EXISTS audit_events (
    id UUID DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    event_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    event_type TEXT NOT NULL,
    model_id UUID REFERENCES ai_models(id),
    agent_id TEXT,
    session_id TEXT,
    action TEXT,
    outcome TEXT,
    confidence_score DECIMAL(4,3),
    policy_violations JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    PRIMARY KEY (id, event_time)
);

SELECT create_hypertable('audit_events', 'event_time', if_not_exists => TRUE);

-- Index for common query patterns
CREATE INDEX IF NOT EXISTS idx_audit_events_tenant_time
    ON audit_events (tenant_id, event_time DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_model
    ON audit_events (model_id, event_time DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_type
    ON audit_events (event_type, event_time DESC);

-- Seed demo tenant
INSERT INTO tenants (id, name) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Acme Corp Demo')
ON CONFLICT DO NOTHING;
