package models

import (
	"encoding/json"
	"time"
)

type AuditEvent struct {
	ID               string          `json:"id" db:"id"`
	TenantID         string          `json:"tenant_id" db:"tenant_id"`
	EventTime        time.Time       `json:"event_time" db:"event_time"`
	EventType        string          `json:"event_type" db:"event_type"`
	ModelID          *string         `json:"model_id" db:"model_id"`
	ModelName        string          `json:"model_name"`
	AgentID          string          `json:"agent_id" db:"agent_id"`
	SessionID        string          `json:"session_id" db:"session_id"`
	Action           string          `json:"action" db:"action"`
	Outcome          string          `json:"outcome" db:"outcome"`
	ConfidenceScore  float64         `json:"confidence_score" db:"confidence_score"`
	PolicyViolations json.RawMessage `json:"policy_violations" db:"policy_violations"`
	Metadata         json.RawMessage `json:"metadata" db:"metadata"`
}

type AuditLogFilter struct {
	StartDate string
	EndDate   string
	EventType string
	Outcome   string
	ModelID   string
	Search    string
	Page      int
	PageSize  int
}

type AuditLogResponse struct {
	Events   []AuditEvent `json:"events"`
	Total    int64        `json:"total"`
	Page     int          `json:"page"`
	PageSize int          `json:"page_size"`
}

// GovernanceMetrics holds aggregated KPIs for the dashboard.
type GovernanceMetrics struct {
	GovernanceScore     float64          `json:"governance_score"`
	ActivePolicies      int64            `json:"active_policies"`
	PolicyViolations24h int64            `json:"policy_violations_24h"`
	ModelsMonitored     int64            `json:"models_monitored"`
	Trend               []ScoreDataPoint `json:"trend"`
}

type ScoreDataPoint struct {
	Date  string  `json:"date"`
	Score float64 `json:"score"`
}

// Alert is a governance alert derived from recent audit events.
type Alert struct {
	ID          string    `json:"id"`
	Severity    string    `json:"severity"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Timestamp   time.Time `json:"timestamp"`
}
