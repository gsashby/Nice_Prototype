// Package system_test — application security tests that run against the live Go
// API at localhost:8080.  They verify behaviour against common attack vectors
// and confirm that parameterised queries, input boundaries, HTTP method
// enforcement, tenant isolation, and response hygiene are all in place.
//
// Start services before running:
//
//	docker compose -f infra/docker/docker-compose.yml up -d
//	make -C apps/api run &
//
// Run with: go test ./... -v -timeout 60s
package system_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ── Security-test helpers ─────────────────────────────────────────────────────

// rawRequest executes an arbitrary HTTP request and returns the full response.
// The caller is responsible for closing resp.Body.
func rawRequest(t *testing.T, method, path string, body []byte, headers map[string]string) *http.Response {
	t.Helper()
	req, err := http.NewRequest(method, baseURL+path, bytes.NewReader(body))
	require.NoError(t, err)
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	return resp
}

// putJSON sends PUT baseURL+path with a JSON-encoded body and decodes the
// response into a map.
func putJSON(t *testing.T, path string, body any) (int, map[string]any) {
	t.Helper()
	b, err := json.Marshal(body)
	require.NoError(t, err)
	resp := rawRequest(t, http.MethodPut, path, b,
		map[string]string{"Content-Type": "application/json"})
	defer resp.Body.Close()
	var m map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&m))
	return resp.StatusCode, m
}

// ── SQL injection resistance ──────────────────────────────────────────────────
// The audit-log repository builds queries with pgx parameterised placeholders
// ($1, $2, …) for all user-supplied values.  Injected SQL is therefore treated
// as a literal string; queries should return 200 with empty or normal results,
// never a 500.

func TestSecurity_SQLi_SearchParam(t *testing.T) {
	payload := url.QueryEscape("' OR '1'='1'; DROP TABLE audit_events; --")
	status, m := getJSON(t, "/api/v1/audit-log?tenant_id="+tenantID+"&search="+payload)
	assert.Equal(t, 200, status,
		"SQLi in search param must return 200, not a server error; body: %v", m)
}

func TestSecurity_SQLi_OutcomeParam(t *testing.T) {
	payload := url.QueryEscape("' OR '1'='1'")
	status, m := getJSON(t, "/api/v1/audit-log?tenant_id="+tenantID+"&outcome="+payload)
	assert.Equal(t, 200, status,
		"SQLi in outcome param must return 200; body: %v", m)
	// The injected string does not match any stored outcome value, so the
	// parameterised WHERE clause returns zero rows — not all rows.
	events, _ := m["events"].([]any)
	assert.Empty(t, events, "SQLi outcome payload must not return any events")
}

func TestSecurity_SQLi_EventTypeParam(t *testing.T) {
	payload := url.QueryEscape("inference'; DROP TABLE audit_events; --")
	status, _ := getJSON(t, "/api/v1/audit-log?tenant_id="+tenantID+"&event_type="+payload)
	assert.Equal(t, 200, status,
		"SQLi in event_type param must not cause a server error")
}

// ── XSS payload in stored data ────────────────────────────────────────────────
// The API returns JSON only — there is no HTML rendering surface.  XSS payloads
// submitted as policy names must be stored and returned as plain JSON strings
// without modification, confirming the API does not silently strip or encode
// content.

func TestSecurity_XSS_PolicyName_StoredAsPlainText(t *testing.T) {
	xssPayload := `<script>alert('xss')</script>`
	name := fmt.Sprintf("XSS-Test-%d %s", time.Now().UnixMilli(), xssPayload)
	status, m := postJSON(t, "/api/v1/policies?tenant_id="+tenantID, map[string]any{
		"name":     name,
		"severity": "low",
		"enabled":  false,
	})
	require.Equal(t, 201, status,
		"policy creation with XSS name must succeed; body: %v", m)
	returned, _ := m["name"].(string)
	assert.Contains(t, returned, xssPayload,
		"XSS payload must be returned as a literal JSON string, not stripped or encoded")
}

// ── Oversized inputs ──────────────────────────────────────────────────────────

// A 10 KB search string exercises the ILIKE parameterised path.  The server
// may return 414 (URI Too Long) for an oversized URL, or 200 with no matches —
// either is acceptable.  A 500 is not.
func TestSecurity_OversizedSearch(t *testing.T) {
	large := url.QueryEscape(strings.Repeat("a", 10_000))
	resp := rawRequest(t, http.MethodGet,
		"/api/v1/audit-log?tenant_id="+tenantID+"&search="+large,
		nil, nil)
	defer resp.Body.Close()
	assert.NotEqual(t, 500, resp.StatusCode,
		"10 KB search string must not cause a server error")
}

// A request body containing a 500 KB name value should be handled gracefully.
// Fiber's default max body size is 4 MB so the body will be parsed; the
// response should be 201 (stored) or 400 (validation failure), not 500.
func TestSecurity_OversizedRequestBody(t *testing.T) {
	largeName := strings.Repeat("x", 500_000)
	body, _ := json.Marshal(map[string]any{
		"name":     fmt.Sprintf("BigName-%d-%s", time.Now().UnixMilli(), largeName),
		"severity": "low",
		"enabled":  true,
	})
	resp := rawRequest(t, http.MethodPost,
		"/api/v1/policies?tenant_id="+tenantID,
		body,
		map[string]string{"Content-Type": "application/json"},
	)
	defer resp.Body.Close()
	assert.NotEqual(t, 500, resp.StatusCode,
		"oversized request body must not cause a server error")
}

// ── Parameter boundary handling ───────────────────────────────────────────────
// The audit-log repository clamps page_size to [1, 200] and page to ≥ 1.
// Callers sending out-of-range or non-numeric values must not trigger a 500.

func TestSecurity_PageSize_ExceedsMax(t *testing.T) {
	status, m := getJSON(t, "/api/v1/audit-log?tenant_id="+tenantID+"&page_size=999999")
	assert.Equal(t, 200, status)
	events, _ := m["events"].([]any)
	assert.True(t, len(events) <= 200,
		"page_size=999999 must be clamped to the repository maximum (200); got %d events",
		len(events))
}

func TestSecurity_PageSize_Negative(t *testing.T) {
	status, _ := getJSON(t, "/api/v1/audit-log?tenant_id="+tenantID+"&page_size=-1")
	assert.Equal(t, 200, status, "negative page_size must not cause a server error")
}

func TestSecurity_PageSize_Zero(t *testing.T) {
	status, _ := getJSON(t, "/api/v1/audit-log?tenant_id="+tenantID+"&page_size=0")
	assert.Equal(t, 200, status, "zero page_size must not cause a server error")
}

func TestSecurity_PageSize_NonNumeric(t *testing.T) {
	status, _ := getJSON(t, "/api/v1/audit-log?tenant_id="+tenantID+"&page_size=abc")
	assert.Equal(t, 200, status, "non-numeric page_size must not cause a server error")
}

func TestSecurity_Page_NonNumeric(t *testing.T) {
	status, _ := getJSON(t, "/api/v1/audit-log?tenant_id="+tenantID+"&page=abc")
	assert.Equal(t, 200, status, "non-numeric page value must not cause a server error")
}

// An unrecognised outcome value should yield an empty result set rather than an
// error, confirming the parameterised equality check is tight.
func TestSecurity_InvalidOutcomeValue(t *testing.T) {
	status, m := getJSON(t, "/api/v1/audit-log?tenant_id="+tenantID+"&outcome=INVALID_OUTCOME")
	assert.Equal(t, 200, status, "unrecognised outcome value must not cause a server error")
	events, _ := m["events"].([]any)
	assert.Empty(t, events, "unrecognised outcome value must return no events")
}

// ── HTTP method enforcement ───────────────────────────────────────────────────
// Fiber registers each route for a specific HTTP method.  Sending an
// unsupported method to a known path must return 405 Method Not Allowed, not
// 404 (which would suggest the endpoint is undiscoverable) or 500.

func TestSecurity_MethodNotAllowed_GovernanceMetrics(t *testing.T) {
	resp := rawRequest(t, http.MethodPost,
		"/api/v1/governance/metrics?tenant_id="+tenantID,
		nil, nil)
	defer resp.Body.Close()
	assert.Equal(t, http.StatusMethodNotAllowed, resp.StatusCode,
		"POST to GET-only /governance/metrics must return 405")
}

func TestSecurity_MethodNotAllowed_AuditLog(t *testing.T) {
	resp := rawRequest(t, http.MethodDelete,
		"/api/v1/audit-log?tenant_id="+tenantID,
		nil, nil)
	defer resp.Body.Close()
	assert.Equal(t, http.StatusMethodNotAllowed, resp.StatusCode,
		"DELETE to GET-only /audit-log must return 405")
}

func TestSecurity_MethodNotAllowed_GovernanceAlerts(t *testing.T) {
	resp := rawRequest(t, http.MethodPut,
		"/api/v1/governance/alerts?tenant_id="+tenantID,
		nil, nil)
	defer resp.Body.Close()
	assert.Equal(t, http.StatusMethodNotAllowed, resp.StatusCode,
		"PUT to GET-only /governance/alerts must return 405")
}

// ── Tenant isolation ──────────────────────────────────────────────────────────
// The repository scopes every query with WHERE tenant_id = $1.  A valid but
// unseeded UUID must return empty collections, not rows from another tenant.

func TestSecurity_Tenant_UnknownUUID_AuditLogEmpty(t *testing.T) {
	unknownTenant := "ffffffff-ffff-ffff-ffff-ffffffffffff"
	status, m := getJSON(t, "/api/v1/audit-log?tenant_id="+unknownTenant)
	require.Equal(t, 200, status)
	total, _ := m["total"].(float64)
	events, _ := m["events"].([]any)
	assert.Equal(t, float64(0), total,
		"unknown tenant must have total=0, not data from another tenant")
	assert.Empty(t, events, "unknown tenant must return no events")
}

func TestSecurity_Tenant_UnknownUUID_PoliciesEmpty(t *testing.T) {
	unknownTenant := "ffffffff-ffff-ffff-ffff-ffffffffffff"
	status, m := getJSON(t, "/api/v1/policies?tenant_id="+unknownTenant)
	require.Equal(t, 200, status)
	policies, _ := m["policies"].([]any)
	assert.Empty(t, policies, "unknown tenant must return no policies")
}

func TestSecurity_Tenant_UnknownUUID_GovernanceModelsEmpty(t *testing.T) {
	unknownTenant := "ffffffff-ffff-ffff-ffff-ffffffffffff"
	status, m := getJSON(t, "/api/v1/governance/models?tenant_id="+unknownTenant)
	require.Equal(t, 200, status)
	models, _ := m["models"].([]any)
	assert.Empty(t, models, "unknown tenant must return no models")
}

// ── Non-existent resource handling ───────────────────────────────────────────
// Operations on a valid-format but non-existent policy UUID must return 404.
// A 500 would indicate an unhandled error and potential internal detail leakage.

func TestSecurity_PolicyNotFound_Update(t *testing.T) {
	status, m := putJSON(t,
		"/api/v1/policies/00000000-0000-0000-0000-000000000000?tenant_id="+tenantID,
		map[string]any{"name": "ghost", "severity": "low", "enabled": false})
	assert.Equal(t, 404, status,
		"PUT on non-existent policy must return 404, not 500; got %v", m)
}

func TestSecurity_PolicyNotFound_Delete(t *testing.T) {
	resp := rawRequest(t, http.MethodDelete,
		"/api/v1/policies/00000000-0000-0000-0000-000000000000?tenant_id="+tenantID,
		nil, nil)
	defer resp.Body.Close()
	assert.Equal(t, 404, resp.StatusCode,
		"DELETE on non-existent policy must return 404, not 500")
}

// ── Response header hygiene ───────────────────────────────────────────────────
// All API responses must declare Content-Type: application/json.
// Absence of this header can mislead clients and trigger content-sniffing by
// older browsers, a vector for reflected XSS in some configurations.

func TestSecurity_ResponseHeaders_ContentType_AuditLog(t *testing.T) {
	resp := rawRequest(t, http.MethodGet,
		"/api/v1/audit-log?tenant_id="+tenantID, nil, nil)
	defer resp.Body.Close()
	assert.Contains(t, resp.Header.Get("Content-Type"), "application/json",
		"audit-log response must declare Content-Type: application/json")
}

func TestSecurity_ResponseHeaders_ContentType_Policies(t *testing.T) {
	resp := rawRequest(t, http.MethodGet,
		"/api/v1/policies?tenant_id="+tenantID, nil, nil)
	defer resp.Body.Close()
	assert.Contains(t, resp.Header.Get("Content-Type"), "application/json",
		"policies response must declare Content-Type: application/json")
}

func TestSecurity_ResponseHeaders_ContentType_Governance(t *testing.T) {
	resp := rawRequest(t, http.MethodGet,
		"/api/v1/governance/metrics?tenant_id="+tenantID, nil, nil)
	defer resp.Body.Close()
	assert.Contains(t, resp.Header.Get("Content-Type"), "application/json",
		"governance/metrics response must declare Content-Type: application/json")
}

// ── CORS enforcement ──────────────────────────────────────────────────────────

// A CORS preflight from the allowed origin (localhost:3000) must receive the
// Access-Control-Allow-Origin header echoed back.
func TestSecurity_CORS_AllowedOrigin(t *testing.T) {
	resp := rawRequest(t, http.MethodOptions, "/api/v1/audit-log", nil,
		map[string]string{
			"Origin":                         "http://localhost:3000",
			"Access-Control-Request-Method":  "GET",
			"Access-Control-Request-Headers": "Content-Type",
		})
	defer resp.Body.Close()
	acao := resp.Header.Get("Access-Control-Allow-Origin")
	assert.Equal(t, "http://localhost:3000", acao,
		"preflight from allowed origin must receive Access-Control-Allow-Origin: http://localhost:3000")
}

// A request carrying an Origin not in ALLOWED_ORIGINS must not receive that
// origin in Access-Control-Allow-Origin.  Browsers enforce this; the test
// confirms the server-side header is set correctly.
func TestSecurity_CORS_DisallowedOrigin(t *testing.T) {
	resp := rawRequest(t, http.MethodOptions, "/api/v1/audit-log", nil,
		map[string]string{
			"Origin":                        "http://evil.example.com",
			"Access-Control-Request-Method": "GET",
		})
	defer resp.Body.Close()
	acao := resp.Header.Get("Access-Control-Allow-Origin")
	assert.NotEqual(t, "http://evil.example.com", acao,
		"preflight from disallowed origin must not echo that origin in Access-Control-Allow-Origin")
}

// ── Missing Content-Type ──────────────────────────────────────────────────────

// POST /policies without a Content-Type header: Fiber's BodyParser cannot
// identify the format and returns an error → handler emits 400.  A 500 here
// would indicate an unhandled panic.
func TestSecurity_MissingContentType_Returns400(t *testing.T) {
	body, _ := json.Marshal(map[string]any{
		"name":     "no-content-type-test",
		"severity": "low",
		"enabled":  false,
	})
	resp := rawRequest(t, http.MethodPost,
		"/api/v1/policies?tenant_id="+tenantID,
		body,
		nil, // deliberately no Content-Type
	)
	defer resp.Body.Close()
	assert.NotEqual(t, 500, resp.StatusCode,
		"POST without Content-Type must not cause a server error")
	assert.Equal(t, 400, resp.StatusCode,
		"POST without Content-Type must return 400 (Fiber BodyParser rejects unknown content types)")
}
