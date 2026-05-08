package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nice-cx/ai-trust-center/api/internal/models"
)

type GovernanceRepo struct {
	db *pgxpool.Pool
}

func NewGovernanceRepo(db *pgxpool.Pool) *GovernanceRepo {
	return &GovernanceRepo{db: db}
}

// GetMetrics returns aggregated KPI metrics for the dashboard.
func (r *GovernanceRepo) GetMetrics(ctx context.Context, tenantID string) (*models.GovernanceMetrics, error) {
	metrics := &models.GovernanceMetrics{}

	// Active policy count
	err := r.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM policies WHERE tenant_id = $1 AND enabled = true`, tenantID,
	).Scan(&metrics.ActivePolicies)
	if err != nil {
		return nil, fmt.Errorf("active policies: %w", err)
	}

	// Policy violations in last 24h (audit events with non-empty violations)
	err = r.db.QueryRow(ctx,
		`SELECT COUNT(*)
		 FROM audit_events
		 WHERE tenant_id = $1
		   AND event_time >= NOW() - INTERVAL '24 hours'
		   AND jsonb_array_length(policy_violations) > 0`,
		tenantID,
	).Scan(&metrics.PolicyViolations24h)
	if err != nil {
		return nil, fmt.Errorf("violations 24h: %w", err)
	}

	// Models monitored
	err = r.db.QueryRow(ctx,
		`SELECT COUNT(*) FROM ai_models WHERE tenant_id = $1 AND status = 'active'`, tenantID,
	).Scan(&metrics.ModelsMonitored)
	if err != nil {
		return nil, fmt.Errorf("models monitored: %w", err)
	}

	// Governance score = weighted average of active model governance_scores
	err = r.db.QueryRow(ctx,
		`SELECT COALESCE(AVG(governance_score), 0)
		 FROM ai_models
		 WHERE tenant_id = $1 AND status = 'active'`, tenantID,
	).Scan(&metrics.GovernanceScore)
	if err != nil {
		return nil, fmt.Errorf("governance score: %w", err)
	}

	// 6-week trend: average governance score bucketed by week
	rows, err := r.db.Query(ctx,
		`SELECT
			to_char(date_trunc('week', event_time), 'Mon DD') AS week,
			ROUND(AVG(confidence_score) * 100, 1) AS score
		 FROM audit_events
		 WHERE tenant_id = $1
		   AND event_time >= NOW() - INTERVAL '6 weeks'
		 GROUP BY date_trunc('week', event_time)
		 ORDER BY date_trunc('week', event_time)`,
		tenantID,
	)
	if err != nil {
		return nil, fmt.Errorf("trend query: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var pt models.ScoreDataPoint
		if err := rows.Scan(&pt.Date, &pt.Score); err != nil {
			return nil, fmt.Errorf("trend scan: %w", err)
		}
		metrics.Trend = append(metrics.Trend, pt)
	}

	return metrics, nil
}

// GetModelHealth returns per-model health metrics including live bias and confidence stats.
func (r *GovernanceRepo) GetModelHealth(ctx context.Context, tenantID string) ([]models.ModelHealth, error) {
	rows, err := r.db.Query(ctx,
		`SELECT
			m.id,
			m.tenant_id,
			m.name,
			m.type,
			m.version,
			m.status,
			m.governance_score,
			m.created_at,
			m.updated_at,
			COALESCE(AVG(ae.confidence_score), 0) AS confidence_avg,
			COUNT(ae.id) AS total_inferences,
			COUNT(ae.id) FILTER (WHERE jsonb_array_length(ae.policy_violations) > 0) AS violation_count
		 FROM ai_models m
		 LEFT JOIN audit_events ae
			ON ae.model_id = m.id
			AND ae.event_time >= NOW() - INTERVAL '7 days'
		 WHERE m.tenant_id = $1
		 GROUP BY m.id
		 ORDER BY m.governance_score DESC`,
		tenantID,
	)
	if err != nil {
		return nil, fmt.Errorf("model health query: %w", err)
	}
	defer rows.Close()

	var results []models.ModelHealth
	for rows.Next() {
		var h models.ModelHealth
		err := rows.Scan(
			&h.ID, &h.TenantID, &h.Name, &h.Type, &h.Version,
			&h.Status, &h.GovernanceScore, &h.CreatedAt, &h.UpdatedAt,
			&h.ConfidenceAvg, &h.TotalInferences, &h.ViolationCount,
		)
		if err != nil {
			return nil, fmt.Errorf("model health scan: %w", err)
		}
		// Derive bias score from violation rate (simplified metric)
		if h.TotalInferences > 0 {
			h.BiasScore = float64(h.ViolationCount) / float64(h.TotalInferences)
		}
		results = append(results, h)
	}

	return results, nil
}

// GetAlerts returns recent high-severity audit events as governance alerts.
func (r *GovernanceRepo) GetAlerts(ctx context.Context, tenantID string, limit int) ([]models.Alert, error) {
	rows, err := r.db.Query(ctx,
		`SELECT
			ae.id,
			ae.event_time,
			ae.event_type,
			ae.action,
			ae.outcome,
			m.name AS model_name,
			ae.policy_violations
		 FROM audit_events ae
		 LEFT JOIN ai_models m ON m.id = ae.model_id
		 WHERE ae.tenant_id = $1
		   AND (ae.outcome = 'blocked' OR jsonb_array_length(ae.policy_violations) > 0)
		   AND ae.event_time >= NOW() - INTERVAL '48 hours'
		 ORDER BY ae.event_time DESC
		 LIMIT $2`,
		tenantID, limit,
	)
	if err != nil {
		return nil, fmt.Errorf("alerts query: %w", err)
	}
	defer rows.Close()

	var alerts []models.Alert
	for rows.Next() {
		var a models.Alert
		var eventType, action, outcome, modelName string
		var violations []byte

		err := rows.Scan(&a.ID, &a.Timestamp, &eventType, &action, &outcome, &modelName, &violations)
		if err != nil {
			return nil, fmt.Errorf("alert scan: %w", err)
		}

		if outcome == "blocked" {
			a.Severity = "critical"
			a.Title = "Action Blocked — Policy Violation"
		} else {
			a.Severity = "high"
			a.Title = "Policy Violation Flagged"
		}
		a.Description = fmt.Sprintf("[%s] %s: %s on model %s", eventType, outcome, action, modelName)
		alerts = append(alerts, a)
	}

	return alerts, nil
}
