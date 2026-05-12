package repository

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nice-cx/ai-trust-center/api/internal/models"
)

type AuditRepo struct {
	db *pgxpool.Pool
}

func NewAuditRepo(db *pgxpool.Pool) *AuditRepo {
	return &AuditRepo{db: db}
}

// List returns a paginated, filtered list of audit events.
func (r *AuditRepo) List(ctx context.Context, tenantID string, f models.AuditLogFilter) (*models.AuditLogResponse, error) {
	if f.Page < 1 {
		f.Page = 1
	}
	if f.PageSize < 1 || f.PageSize > 200 {
		f.PageSize = 50
	}

	// Build dynamic WHERE clauses
	where := []string{"ae.tenant_id = $1"}
	args := []any{tenantID}
	n := 2

	if f.StartDate != "" {
		where = append(where, fmt.Sprintf("ae.event_time >= $%d", n))
		args = append(args, f.StartDate)
		n++
	}
	if f.EndDate != "" {
		where = append(where, fmt.Sprintf("ae.event_time <= $%d", n))
		args = append(args, f.EndDate)
		n++
	}
	if f.EventType != "" {
		where = append(where, fmt.Sprintf("ae.event_type = $%d", n))
		args = append(args, f.EventType)
		n++
	}
	if f.Outcome != "" {
		where = append(where, fmt.Sprintf("ae.outcome = $%d", n))
		args = append(args, f.Outcome)
		n++
	}
	if f.ModelID != "" {
		where = append(where, fmt.Sprintf("ae.model_id = $%d", n))
		args = append(args, f.ModelID)
		n++
	}
	if f.ModelName != "" {
		where = append(where, fmt.Sprintf("m.name ILIKE $%d", n))
		args = append(args, "%"+f.ModelName+"%")
		n++
	}
	if f.Search != "" {
		where = append(where, fmt.Sprintf("(ae.action ILIKE $%d OR ae.agent_id ILIKE $%d OR ae.session_id ILIKE $%d)", n, n, n))
		args = append(args, "%"+f.Search+"%")
		n++
	}

	whereClause := strings.Join(where, " AND ")
	offset := (f.Page - 1) * f.PageSize

	// Total count
	var total int64
	countSQL := fmt.Sprintf(`SELECT COUNT(*) FROM audit_events ae WHERE %s`, whereClause)
	if err := r.db.QueryRow(ctx, countSQL, args...).Scan(&total); err != nil {
		return nil, fmt.Errorf("count audit events: %w", err)
	}

	// Paginated data — join model name
	dataSQL := fmt.Sprintf(`
		SELECT
			ae.id,
			ae.tenant_id,
			ae.event_time,
			ae.event_type,
			ae.model_id,
			COALESCE(m.name, '') AS model_name,
			ae.agent_id,
			ae.session_id,
			ae.action,
			ae.outcome,
			ae.confidence_score,
			ae.policy_violations,
			ae.metadata
		FROM audit_events ae
		LEFT JOIN ai_models m ON m.id = ae.model_id
		WHERE %s
		ORDER BY ae.event_time DESC
		LIMIT $%d OFFSET $%d`,
		whereClause, n, n+1,
	)
	args = append(args, f.PageSize, offset)

	rows, err := r.db.Query(ctx, dataSQL, args...)
	if err != nil {
		return nil, fmt.Errorf("list audit events: %w", err)
	}
	defer rows.Close()

	var events []models.AuditEvent
	for rows.Next() {
		var e models.AuditEvent
		err := rows.Scan(
			&e.ID, &e.TenantID, &e.EventTime, &e.EventType,
			&e.ModelID, &e.ModelName, &e.AgentID, &e.SessionID,
			&e.Action, &e.Outcome, &e.ConfidenceScore,
			&e.PolicyViolations, &e.Metadata,
		)
		if err != nil {
			return nil, fmt.Errorf("scan audit event: %w", err)
		}
		events = append(events, e)
	}

	return &models.AuditLogResponse{
		Events:   events,
		Total:    total,
		Page:     f.Page,
		PageSize: f.PageSize,
	}, nil
}
