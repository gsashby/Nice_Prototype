package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/nice-cx/ai-trust-center/api/internal/models"
)

type PolicyRepo struct {
	db *pgxpool.Pool
}

func NewPolicyRepo(db *pgxpool.Pool) *PolicyRepo {
	return &PolicyRepo{db: db}
}

// List returns all policies for a tenant with their 7-day violation counts.
func (r *PolicyRepo) List(ctx context.Context, tenantID string) ([]models.Policy, error) {
	rows, err := r.db.Query(ctx,
		`SELECT
			p.id,
			p.tenant_id,
			p.name,
			p.description,
			p.severity,
			p.enabled,
			p.rule_config,
			p.created_at,
			p.updated_at,
			COUNT(ae.id) AS violation_count
		 FROM policies p
		 LEFT JOIN audit_events ae
			ON ae.tenant_id = p.tenant_id
			AND ae.policy_violations @> jsonb_build_array(p.name)
			AND ae.event_time >= NOW() - INTERVAL '7 days'
		 WHERE p.tenant_id = $1
		 GROUP BY p.id
		 ORDER BY
			CASE p.severity
				WHEN 'critical' THEN 1
				WHEN 'high' THEN 2
				WHEN 'medium' THEN 3
				WHEN 'low' THEN 4
			END,
			p.name`,
		tenantID,
	)
	if err != nil {
		return nil, fmt.Errorf("list policies: %w", err)
	}
	defer rows.Close()

	var policies []models.Policy
	for rows.Next() {
		var p models.Policy
		err := rows.Scan(
			&p.ID, &p.TenantID, &p.Name, &p.Description,
			&p.Severity, &p.Enabled, &p.RuleConfig,
			&p.CreatedAt, &p.UpdatedAt, &p.ViolationCount,
		)
		if err != nil {
			return nil, fmt.Errorf("scan policy: %w", err)
		}
		policies = append(policies, p)
	}
	return policies, nil
}

// Create inserts a new policy and returns it.
func (r *PolicyRepo) Create(ctx context.Context, tenantID string, req models.CreatePolicyRequest) (*models.Policy, error) {
	if req.RuleConfig == nil {
		req.RuleConfig = json.RawMessage("{}")
	}

	p := &models.Policy{
		ID:          uuid.New().String(),
		TenantID:    tenantID,
		Name:        req.Name,
		Description: req.Description,
		Severity:    req.Severity,
		Enabled:     req.Enabled,
		RuleConfig:  req.RuleConfig,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	_, err := r.db.Exec(ctx,
		`INSERT INTO policies (id, tenant_id, name, description, severity, enabled, rule_config, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		p.ID, p.TenantID, p.Name, p.Description, p.Severity, p.Enabled, p.RuleConfig, p.CreatedAt, p.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("create policy: %w", err)
	}

	return p, nil
}

// Update replaces the mutable fields of a policy.
func (r *PolicyRepo) Update(ctx context.Context, policyID, tenantID string, req models.CreatePolicyRequest) (*models.Policy, error) {
	if req.RuleConfig == nil {
		req.RuleConfig = json.RawMessage("{}")
	}

	var p models.Policy
	err := r.db.QueryRow(ctx,
		`UPDATE policies
		 SET name        = $3,
		     description = $4,
		     severity    = $5,
		     enabled     = $6,
		     rule_config = $7,
		     updated_at  = NOW()
		 WHERE id = $1 AND tenant_id = $2
		 RETURNING id, tenant_id, name, description, severity, enabled, rule_config, created_at, updated_at`,
		policyID, tenantID, req.Name, req.Description, req.Severity, req.Enabled, req.RuleConfig,
	).Scan(&p.ID, &p.TenantID, &p.Name, &p.Description, &p.Severity, &p.Enabled, &p.RuleConfig, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("policy not found")
	}
	return &p, nil
}

// Delete removes a policy permanently.
func (r *PolicyRepo) Delete(ctx context.Context, policyID, tenantID string) error {
	tag, err := r.db.Exec(ctx,
		`DELETE FROM policies WHERE id = $1 AND tenant_id = $2`,
		policyID, tenantID,
	)
	if err != nil {
		return fmt.Errorf("delete policy: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("policy not found")
	}
	return nil
}

// ToggleEnabled flips the enabled state of a policy.
func (r *PolicyRepo) ToggleEnabled(ctx context.Context, policyID, tenantID string, enabled bool) error {
	tag, err := r.db.Exec(ctx,
		`UPDATE policies SET enabled = $1, updated_at = NOW()
		 WHERE id = $2 AND tenant_id = $3`,
		enabled, policyID, tenantID,
	)
	if err != nil {
		return fmt.Errorf("toggle policy: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("policy not found")
	}
	return nil
}
