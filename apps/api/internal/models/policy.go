package models

import (
	"encoding/json"
	"time"
)

type Policy struct {
	ID             string          `json:"id" db:"id"`
	TenantID       string          `json:"tenant_id" db:"tenant_id"`
	Name           string          `json:"name" db:"name"`
	Description    string          `json:"description" db:"description"`
	Severity       string          `json:"severity" db:"severity"`
	Enabled        bool            `json:"enabled" db:"enabled"`
	RuleConfig     json.RawMessage `json:"rule_config" db:"rule_config"`
	CreatedAt      time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time       `json:"updated_at" db:"updated_at"`
	ViolationCount int64           `json:"violation_count"`
}

type CreatePolicyRequest struct {
	Name        string          `json:"name"`
	Description string          `json:"description"`
	Severity    string          `json:"severity"`
	Enabled     bool            `json:"enabled"`
	RuleConfig  json.RawMessage `json:"rule_config"`
}
