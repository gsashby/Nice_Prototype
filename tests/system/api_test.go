// Package system_test contains end-to-end integration tests that run against
// the live Go API at localhost:8080.  Start all services before running:
//
//	docker compose -f infra/docker/docker-compose.yml up -d
//	make -C apps/api run &
//
// Run with: go test ./... -v -timeout 30s
package system_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const (
	baseURL  = "http://localhost:8080"
	tenantID = "00000000-0000-0000-0000-000000000001"
)

// ── HTTP helpers ──────────────────────────────────────────────────────────────

func getJSON(t *testing.T, path string) (int, map[string]any) {
	t.Helper()
	resp, err := http.Get(baseURL + path)
	require.NoError(t, err, "GET %s", path)
	defer resp.Body.Close()
	var m map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&m))
	return resp.StatusCode, m
}

func postJSON(t *testing.T, path string, body any) (int, map[string]any) {
	t.Helper()
	b, err := json.Marshal(body)
	require.NoError(t, err)
	resp, err := http.Post(baseURL+path, "application/json", bytes.NewReader(b))
	require.NoError(t, err, "POST %s", path)
	defer resp.Body.Close()
	var m map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&m))
	return resp.StatusCode, m
}

func patchJSON(t *testing.T, path string, body any) (int, map[string]any) {
	t.Helper()
	b, err := json.Marshal(body)
	require.NoError(t, err)
	req, err := http.NewRequest("PATCH", baseURL+path, bytes.NewReader(b))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err, "PATCH %s", path)
	defer resp.Body.Close()
	var m map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&m))
	return resp.StatusCode, m
}

func getList(t *testing.T, path string) (int, []any) {
	t.Helper()
	resp, err := http.Get(baseURL + path)
	require.NoError(t, err, "GET %s", path)
	defer resp.Body.Close()
	var arr []any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&arr))
	return resp.StatusCode, arr
}

// ── Governance metrics ────────────────────────────────────────────────────────

func TestGovernanceMetrics_Returns200(t *testing.T) {
	status, _ := getJSON(t, "/api/v1/governance/metrics?tenant_id="+tenantID)
	assert.Equal(t, 200, status)
}

func TestGovernanceMetrics_RequiredFields(t *testing.T) {
	_, m := getJSON(t, "/api/v1/governance/metrics?tenant_id="+tenantID)

	required := []string{"governance_score", "active_policies", "policy_violations_24h", "models_monitored", "trend"}
	for _, k := range required {
		assert.Contains(t, m, k, "metrics response missing field %q", k)
	}
}

func TestGovernanceMetrics_ScoreInRange(t *testing.T) {
	_, m := getJSON(t, "/api/v1/governance/metrics?tenant_id="+tenantID)
	score, ok := m["governance_score"].(float64)
	require.True(t, ok, "governance_score must be a number")
	assert.True(t, score >= 0 && score <= 100, "governance_score=%v must be in [0,100]", score)
}

func TestGovernanceMetrics_TrendIsNonEmptyArray(t *testing.T) {
	_, m := getJSON(t, "/api/v1/governance/metrics?tenant_id="+tenantID)
	trend, ok := m["trend"].([]any)
	require.True(t, ok, "trend must be an array")
	assert.NotEmpty(t, trend, "trend should contain at least one data point")
}

func TestGovernanceMetrics_TrendPointShape(t *testing.T) {
	_, m := getJSON(t, "/api/v1/governance/metrics?tenant_id="+tenantID)
	trend, _ := m["trend"].([]any)
	require.NotEmpty(t, trend)
	point, ok := trend[0].(map[string]any)
	require.True(t, ok)
	assert.Contains(t, point, "date")
	assert.Contains(t, point, "score")
}

// ── Model health ──────────────────────────────────────────────────────────────

func TestGovernanceModels_Returns200(t *testing.T) {
	status, _ := getJSON(t, "/api/v1/governance/models?tenant_id="+tenantID)
	assert.Equal(t, 200, status)
}

func TestGovernanceModels_WrappedInModelsKey(t *testing.T) {
	_, m := getJSON(t, "/api/v1/governance/models?tenant_id="+tenantID)
	_, ok := m["models"]
	assert.True(t, ok, "response must have a 'models' key")
}

func TestGovernanceModels_ModelShape(t *testing.T) {
	_, m := getJSON(t, "/api/v1/governance/models?tenant_id="+tenantID)
	models, ok := m["models"].([]any)
	require.True(t, ok)
	require.NotEmpty(t, models)

	model := models[0].(map[string]any)
	required := []string{"id", "name", "status", "confidence_avg", "total_inferences", "violation_count"}
	for _, k := range required {
		assert.Contains(t, model, k, "model missing field %q", k)
	}
}

// ── Governance alerts ─────────────────────────────────────────────────────────

func TestGovernanceAlerts_Returns200(t *testing.T) {
	status, _ := getJSON(t, "/api/v1/governance/alerts?tenant_id="+tenantID)
	assert.Equal(t, 200, status)
}

func TestGovernanceAlerts_WrappedInAlertsKey(t *testing.T) {
	_, m := getJSON(t, "/api/v1/governance/alerts?tenant_id="+tenantID)
	_, ok := m["alerts"]
	assert.True(t, ok, "response must have an 'alerts' key")
}

func TestGovernanceAlerts_AlertShape(t *testing.T) {
	_, m := getJSON(t, "/api/v1/governance/alerts?tenant_id="+tenantID)
	alerts, ok := m["alerts"].([]any)
	require.True(t, ok)
	if len(alerts) == 0 {
		t.Skip("no alerts in database — seed data first")
	}
	alert := alerts[0].(map[string]any)
	for _, k := range []string{"id", "severity", "title", "description", "timestamp"} {
		assert.Contains(t, alert, k, "alert missing field %q", k)
	}
}

func TestGovernanceAlerts_ValidSeverities(t *testing.T) {
	_, m := getJSON(t, "/api/v1/governance/alerts?tenant_id="+tenantID)
	alerts, _ := m["alerts"].([]any)
	valid := map[string]bool{"critical": true, "high": true, "medium": true, "low": true}
	for _, a := range alerts {
		alert := a.(map[string]any)
		sev, _ := alert["severity"].(string)
		assert.True(t, valid[sev], "alert has invalid severity %q", sev)
	}
}

// ── Audit log ─────────────────────────────────────────────────────────────────

func TestAuditLog_Returns200(t *testing.T) {
	status, _ := getJSON(t, "/api/v1/audit-log?tenant_id="+tenantID)
	assert.Equal(t, 200, status)
}

func TestAuditLog_PaginationShape(t *testing.T) {
	_, m := getJSON(t, "/api/v1/audit-log?tenant_id="+tenantID)
	assert.Contains(t, m, "events")
	assert.Contains(t, m, "total")
	assert.Contains(t, m, "page")
	assert.Contains(t, m, "page_size")
}

func TestAuditLog_DefaultPageSizeMax50(t *testing.T) {
	_, m := getJSON(t, "/api/v1/audit-log?tenant_id="+tenantID)
	events, _ := m["events"].([]any)
	assert.True(t, len(events) <= 50, "default page size should be ≤50, got %d", len(events))
}

func TestAuditLog_EventShape(t *testing.T) {
	_, m := getJSON(t, "/api/v1/audit-log?tenant_id="+tenantID+"&page_size=1")
	events, _ := m["events"].([]any)
	require.NotEmpty(t, events, "expected at least one audit event — run make seed")
	e := events[0].(map[string]any)
	for _, k := range []string{"id", "event_time", "event_type", "outcome", "confidence_score", "policy_violations"} {
		assert.Contains(t, e, k, "audit event missing field %q", k)
	}
}

func TestAuditLog_ConfidenceScoreRange(t *testing.T) {
	_, m := getJSON(t, "/api/v1/audit-log?tenant_id="+tenantID+"&page_size=50")
	events, _ := m["events"].([]any)
	for _, ev := range events {
		e := ev.(map[string]any)
		score, ok := e["confidence_score"].(float64)
		if ok {
			assert.True(t, score >= 0 && score <= 1, "confidence_score %v out of [0,1]", score)
		}
	}
}

func TestAuditLog_OutcomeFilter_Blocked(t *testing.T) {
	_, m := getJSON(t, "/api/v1/audit-log?tenant_id="+tenantID+"&outcome=blocked&page_size=20")
	events, _ := m["events"].([]any)
	for _, ev := range events {
		e := ev.(map[string]any)
		assert.Equal(t, "blocked", e["outcome"], "outcome filter returned non-blocked event")
	}
}

func TestAuditLog_OutcomeFilter_Allowed(t *testing.T) {
	_, m := getJSON(t, "/api/v1/audit-log?tenant_id="+tenantID+"&outcome=allowed&page_size=20")
	events, _ := m["events"].([]any)
	for _, ev := range events {
		e := ev.(map[string]any)
		assert.Equal(t, "allowed", e["outcome"])
	}
}

func TestAuditLog_OutcomeFilter_Flagged(t *testing.T) {
	_, m := getJSON(t, "/api/v1/audit-log?tenant_id="+tenantID+"&outcome=flagged&page_size=20")
	events, _ := m["events"].([]any)
	for _, ev := range events {
		e := ev.(map[string]any)
		assert.Equal(t, "flagged", e["outcome"])
	}
}

func TestAuditLog_PageSizeRespected(t *testing.T) {
	_, m := getJSON(t, "/api/v1/audit-log?tenant_id="+tenantID+"&page_size=5")
	events, _ := m["events"].([]any)
	assert.True(t, len(events) <= 5, "expected ≤5 events, got %d", len(events))
}

func TestAuditLog_TotalIsPositive(t *testing.T) {
	_, m := getJSON(t, "/api/v1/audit-log?tenant_id="+tenantID)
	total, ok := m["total"].(float64)
	require.True(t, ok)
	assert.True(t, total > 0, "total should be positive after seeding — run make seed")
}

func TestAuditLog_SecondPageDifferentFromFirst(t *testing.T) {
	_, m1 := getJSON(t, "/api/v1/audit-log?tenant_id="+tenantID+"&page=1&page_size=10")
	_, m2 := getJSON(t, "/api/v1/audit-log?tenant_id="+tenantID+"&page=2&page_size=10")
	events1, _ := m1["events"].([]any)
	events2, _ := m2["events"].([]any)
	if len(events1) == 0 || len(events2) == 0 {
		t.Skip("not enough data for pagination test")
	}
	id1 := events1[0].(map[string]any)["id"]
	id2 := events2[0].(map[string]any)["id"]
	assert.NotEqual(t, id1, id2, "page 1 and page 2 should return different events")
}

// ── Policies ──────────────────────────────────────────────────────────────────

func TestPolicies_List_Returns200(t *testing.T) {
	status, _ := getJSON(t, "/api/v1/policies?tenant_id="+tenantID)
	assert.Equal(t, 200, status)
}

func TestPolicies_List_WrappedInPoliciesKey(t *testing.T) {
	_, m := getJSON(t, "/api/v1/policies?tenant_id="+tenantID)
	_, ok := m["policies"]
	assert.True(t, ok)
}

func TestPolicies_List_PolicyShape(t *testing.T) {
	_, m := getJSON(t, "/api/v1/policies?tenant_id="+tenantID)
	policies, ok := m["policies"].([]any)
	require.True(t, ok)
	require.NotEmpty(t, policies, "expected seeded policies — run make seed")
	p := policies[0].(map[string]any)
	for _, k := range []string{"id", "name", "severity", "enabled", "violation_count"} {
		assert.Contains(t, p, k, "policy missing field %q", k)
	}
}

func TestPolicies_List_ValidSeverities(t *testing.T) {
	_, m := getJSON(t, "/api/v1/policies?tenant_id="+tenantID)
	policies, _ := m["policies"].([]any)
	valid := map[string]bool{"critical": true, "high": true, "medium": true, "low": true}
	for _, pol := range policies {
		p := pol.(map[string]any)
		sev, _ := p["severity"].(string)
		assert.True(t, valid[sev], "policy has invalid severity %q", sev)
	}
}

func TestPolicies_Create_Returns201(t *testing.T) {
	status, _ := postJSON(t, "/api/v1/policies?tenant_id="+tenantID, map[string]any{
		"name":        fmt.Sprintf("SysTest-%d", time.Now().UnixMilli()),
		"description": "Created by system test",
		"severity":    "low",
		"enabled":     true,
		"rule_config": map[string]any{},
	})
	assert.Equal(t, 201, status)
}

func TestPolicies_Create_ReturnsID(t *testing.T) {
	_, m := postJSON(t, "/api/v1/policies?tenant_id="+tenantID, map[string]any{
		"name":     fmt.Sprintf("SysTest-%d", time.Now().UnixMilli()),
		"severity": "medium",
		"enabled":  false,
	})
	id, _ := m["id"].(string)
	assert.NotEmpty(t, id)
}

func TestPolicies_Create_MissingName_Returns400(t *testing.T) {
	status, m := postJSON(t, "/api/v1/policies?tenant_id="+tenantID, map[string]any{
		"severity": "high",
		"enabled":  true,
	})
	assert.Equal(t, 400, status)
	assert.Equal(t, "name is required", m["error"])
}

func TestPolicies_Create_InvalidSeverity_Returns400(t *testing.T) {
	status, m := postJSON(t, "/api/v1/policies?tenant_id="+tenantID, map[string]any{
		"name":     "Bad Sev Policy",
		"severity": "extreme",
	})
	assert.Equal(t, 400, status)
	assert.Contains(t, m["error"], "severity must be")
}

func TestPolicies_Toggle_Returns200(t *testing.T) {
	// Create a policy first
	_, created := postJSON(t, "/api/v1/policies?tenant_id="+tenantID, map[string]any{
		"name":     fmt.Sprintf("Toggle-%d", time.Now().UnixMilli()),
		"severity": "low",
		"enabled":  true,
	})
	policyID, _ := created["id"].(string)
	require.NotEmpty(t, policyID)

	// Toggle it off
	status, m := patchJSON(t,
		fmt.Sprintf("/api/v1/policies/%s/toggle?tenant_id=%s", policyID, tenantID),
		map[string]bool{"enabled": false},
	)
	assert.Equal(t, 200, status)
	assert.Equal(t, true, m["ok"])
}

func TestPolicies_Toggle_InvalidBody_Returns400(t *testing.T) {
	req, _ := http.NewRequest("PATCH",
		baseURL+"/api/v1/policies/nonexistent/toggle?tenant_id="+tenantID,
		bytes.NewReader([]byte(`{{{broken`)),
	)
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()
	assert.Equal(t, 400, resp.StatusCode)
}
