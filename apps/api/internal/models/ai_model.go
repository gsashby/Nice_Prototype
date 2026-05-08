package models

import "time"

type AIModel struct {
	ID              string    `json:"id" db:"id"`
	TenantID        string    `json:"tenant_id" db:"tenant_id"`
	Name            string    `json:"name" db:"name"`
	Type            string    `json:"type" db:"type"`
	Version         string    `json:"version" db:"version"`
	Status          string    `json:"status" db:"status"`
	GovernanceScore float64   `json:"governance_score" db:"governance_score"`
	CreatedAt       time.Time `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time `json:"updated_at" db:"updated_at"`
}

// ModelHealth extends AIModel with computed live metrics.
type ModelHealth struct {
	AIModel
	BiasScore      float64 `json:"bias_score"`
	ConfidenceAvg  float64 `json:"confidence_avg"`
	TotalInferences int64   `json:"total_inferences"`
	ViolationCount  int64   `json:"violation_count"`
}
