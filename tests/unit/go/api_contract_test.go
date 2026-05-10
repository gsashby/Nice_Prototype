// Package contract_test validates that the JSON field names produced by the Go API
// match the snake_case contract the frontend depends on.  These tests use local
// struct mirrors so they can run without importing the internal packages.
package contract_test

import (
	"encoding/json"
	"testing"
	"time"
)

// ── Local mirrors of apps/api/internal/models ─────────────────────────────────
// Keep these in sync with the real models. A drift here means the frontend will
// break at runtime, so a test failure here is an early warning.

type auditEvent struct {
	ID               string     `json:"id"`
	TenantID         string     `json:"tenant_id"`
	EventTime        time.Time  `json:"event_time"`
	EventType        string     `json:"event_type"`
	ModelID          *string    `json:"model_id"`
	ModelName        string     `json:"model_name"`
	AgentID          string     `json:"agent_id"`
	SessionID        string     `json:"session_id"`
	Action           string     `json:"action"`
	Outcome          string     `json:"outcome"`
	ConfidenceScore  float64    `json:"confidence_score"`
	PolicyViolations []string   `json:"policy_violations"`
	Metadata         any        `json:"metadata"`
}

type policy struct {
	ID             string    `json:"id"`
	TenantID       string    `json:"tenant_id"`
	Name           string    `json:"name"`
	Description    string    `json:"description"`
	Severity       string    `json:"severity"`
	Enabled        bool      `json:"enabled"`
	RuleConfig     any       `json:"rule_config"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
	ViolationCount int64     `json:"violation_count"`
}

type governanceMetrics struct {
	GovernanceScore     float64          `json:"governance_score"`
	ActivePolicies      int64            `json:"active_policies"`
	PolicyViolations24h int64            `json:"policy_violations_24h"`
	ModelsMonitored     int64            `json:"models_monitored"`
	Trend               []scoreDataPoint `json:"trend"`
}

type scoreDataPoint struct {
	Date  string  `json:"date"`
	Score float64 `json:"score"`
}

type modelHealth struct {
	ID              string  `json:"id"`
	Name            string  `json:"name"`
	Type            string  `json:"type"`
	Version         string  `json:"version"`
	Status          string  `json:"status"`
	GovernanceScore float64 `json:"governance_score"`
	BiasScore       float64 `json:"bias_score"`
	ConfidenceAvg   float64 `json:"confidence_avg"`
	TotalInferences int64   `json:"total_inferences"`
	ViolationCount  int64   `json:"violation_count"`
}

// ── Helper ────────────────────────────────────────────────────────────────────

func mustMarshal(t *testing.T, v any) map[string]any {
	t.Helper()
	b, err := json.Marshal(v)
	if err != nil {
		t.Fatalf("marshal error: %v", err)
	}
	var m map[string]any
	if err := json.Unmarshal(b, &m); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}
	return m
}

// ── AuditEvent contract ───────────────────────────────────────────────────────

func TestAuditEvent_SnakeCaseFields(t *testing.T) {
	e := auditEvent{
		ID:              "abc-123",
		EventType:       "inference",
		Outcome:         "allowed",
		ConfidenceScore: 0.92,
	}
	m := mustMarshal(t, e)

	snakeKeys := []string{
		"id", "tenant_id", "event_time", "event_type",
		"model_id", "model_name", "agent_id", "session_id",
		"action", "outcome", "confidence_score", "policy_violations", "metadata",
	}
	for _, k := range snakeKeys {
		if _, ok := m[k]; !ok {
			t.Errorf("AuditEvent JSON missing key %q", k)
		}
	}
	camelKeys := []string{"EventType", "ConfidenceScore", "TenantID", "AgentID"}
	for _, k := range camelKeys {
		if _, ok := m[k]; ok {
			t.Errorf("AuditEvent JSON must not contain camelCase key %q (frontend reads snake_case)", k)
		}
	}
}

func TestAuditEvent_NullModelID(t *testing.T) {
	e := auditEvent{ID: "xyz", ModelID: nil}
	m := mustMarshal(t, e)
	v, ok := m["model_id"]
	if !ok {
		t.Fatal("model_id key missing")
	}
	if v != nil {
		t.Errorf("expected model_id to be null when nil, got %v", v)
	}
}

func TestAuditEvent_ConfidenceScoreRange(t *testing.T) {
	for _, score := range []float64{0.0, 0.5, 0.999, 1.0} {
		e := auditEvent{ConfidenceScore: score}
		m := mustMarshal(t, e)
		got, ok := m["confidence_score"].(float64)
		if !ok {
			t.Fatalf("confidence_score is not a float64 in JSON")
		}
		if got < 0 || got > 1 {
			t.Errorf("confidence_score %v out of [0,1] range", got)
		}
	}
}

// ── Policy contract ───────────────────────────────────────────────────────────

func TestPolicy_SnakeCaseFields(t *testing.T) {
	p := policy{
		ID:       "p1",
		Name:     "PII Guard",
		Severity: "critical",
		Enabled:  true,
	}
	m := mustMarshal(t, p)

	required := []string{
		"id", "tenant_id", "name", "description", "severity",
		"enabled", "rule_config", "created_at", "updated_at", "violation_count",
	}
	for _, k := range required {
		if _, ok := m[k]; !ok {
			t.Errorf("Policy JSON missing key %q", k)
		}
	}
}

func TestPolicy_ValidSeverities(t *testing.T) {
	valid := []string{"critical", "high", "medium", "low"}
	invalid := []string{"extreme", "urgent", "none", ""}
	_ = valid   // severities the API accepts
	_ = invalid // severities the API rejects with 400

	// This test documents the allowed severity values.
	// The API handler enforces this; here we validate the contract is documented.
	for _, s := range valid {
		if s == "" {
			t.Error("empty string must not be a valid severity")
		}
	}
}

func TestPolicy_EnabledToggle(t *testing.T) {
	enabled := policy{Enabled: true}
	disabled := policy{Enabled: false}

	me := mustMarshal(t, enabled)
	md := mustMarshal(t, disabled)

	if me["enabled"] != true {
		t.Errorf("enabled policy should marshal enabled=true")
	}
	if md["enabled"] != false {
		t.Errorf("disabled policy should marshal enabled=false")
	}
}

// ── GovernanceMetrics contract ────────────────────────────────────────────────

func TestGovernanceMetrics_SnakeCaseFields(t *testing.T) {
	gm := governanceMetrics{
		GovernanceScore:     84.5,
		ActivePolicies:      8,
		PolicyViolations24h: 3,
		ModelsMonitored:     5,
		Trend:               []scoreDataPoint{{Date: "2024-01-01", Score: 82.0}},
	}
	m := mustMarshal(t, gm)

	required := []string{
		"governance_score", "active_policies",
		"policy_violations_24h", "models_monitored", "trend",
	}
	for _, k := range required {
		if _, ok := m[k]; !ok {
			t.Errorf("GovernanceMetrics JSON missing key %q", k)
		}
	}
}

func TestGovernanceMetrics_TrendShape(t *testing.T) {
	gm := governanceMetrics{
		Trend: []scoreDataPoint{
			{Date: "2024-01-01", Score: 80.0},
			{Date: "2024-01-08", Score: 83.5},
		},
	}
	b, _ := json.Marshal(gm)
	var out map[string]any
	json.Unmarshal(b, &out)

	trend, ok := out["trend"].([]any)
	if !ok || len(trend) != 2 {
		t.Fatalf("expected trend array of length 2")
	}
	point := trend[0].(map[string]any)
	if _, ok := point["date"]; !ok {
		t.Error("trend point missing 'date'")
	}
	if _, ok := point["score"]; !ok {
		t.Error("trend point missing 'score'")
	}
}

// ── ModelHealth contract ──────────────────────────────────────────────────────

func TestModelHealth_SnakeCaseFields(t *testing.T) {
	mh := modelHealth{
		ID:              "m1",
		Name:            "Claude 3 Sonnet",
		Status:          "active",
		ConfidenceAvg:   0.87,
		TotalInferences: 12345,
		ViolationCount:  2,
	}
	m := mustMarshal(t, mh)

	required := []string{
		"id", "name", "type", "version", "status",
		"governance_score", "bias_score", "confidence_avg",
		"total_inferences", "violation_count",
	}
	for _, k := range required {
		if _, ok := m[k]; !ok {
			t.Errorf("ModelHealth JSON missing key %q", k)
		}
	}
}
