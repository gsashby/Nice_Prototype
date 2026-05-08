// cmd/seed/main.go — populates the database with realistic demo data.
// Run: go run ./cmd/seed/main.go
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

// ── Fixed demo IDs ──────────────────────────────────────────────────────────

const tenantID = "00000000-0000-0000-0000-000000000001"

var modelIDs = []string{
	"11111111-1111-1111-1111-000000000001",
	"11111111-1111-1111-1111-000000000002",
	"11111111-1111-1111-1111-000000000003",
	"11111111-1111-1111-1111-000000000004",
	"11111111-1111-1111-1111-000000000005",
	"11111111-1111-1111-1111-000000000006",
}

// ── Seed data definitions ───────────────────────────────────────────────────

type modelDef struct {
	id              string
	name            string
	modelType       string
	version         string
	status          string
	governanceScore float64
}

var models = []modelDef{
	{"11111111-1111-1111-1111-000000000001", "CXone Virtual Agent v3", "LLM", "3.2.1", "active", 96.2},
	{"11111111-1111-1111-1111-000000000002", "Sentiment Analyzer Pro", "Classifier", "2.4.0", "active", 78.4},
	{"11111111-1111-1111-1111-000000000003", "Intent Router", "Classifier", "1.8.5", "active", 94.1},
	{"11111111-1111-1111-1111-000000000004", "Copilot Assistant", "LLM", "1.0.3", "active", 62.0},
	{"11111111-1111-1111-1111-000000000005", "Knowledge Retrieval Engine", "RAG", "4.1.0", "active", 91.7},
	{"11111111-1111-1111-1111-000000000006", "Forecasting Model v2", "Regression", "2.0.0", "inactive", 85.3},
}

type policyDef struct {
	name        string
	description string
	severity    string
	enabled     bool
	ruleConfig  map[string]any
}

var policies = []policyDef{
	{
		"Confidence Floor",
		"Block AI responses with confidence score below 70%",
		"critical", true,
		map[string]any{"threshold": 0.70, "action": "block"},
	},
	{
		"Bias Threshold",
		"Flag models where violation rate exceeds 10% in a 24-hour window",
		"high", true,
		map[string]any{"max_violation_rate": 0.10, "window_hours": 24},
	},
	{
		"Content Safety",
		"Block responses containing harmful, offensive, or sensitive content",
		"critical", true,
		map[string]any{"categories": []string{"hate_speech", "self_harm", "violence"}, "action": "block"},
	},
	{
		"PII Redaction",
		"Ensure personally identifiable information is redacted before logging",
		"high", true,
		map[string]any{"fields": []string{"email", "phone", "ssn", "credit_card"}},
	},
	{
		"Data Residency",
		"Ensure all AI inference stays within approved geographic regions",
		"medium", false,
		map[string]any{"allowed_regions": []string{"us-east-1", "eu-west-1"}},
	},
	{
		"Session Length Limit",
		"Alert when an AI session exceeds 60 minutes of continuous usage",
		"medium", true,
		map[string]any{"max_minutes": 60, "action": "alert"},
	},
	{
		"Audit Completeness",
		"Require all AI decisions to have a complete audit trail entry",
		"high", true,
		map[string]any{"required_fields": []string{"model_id", "session_id", "confidence_score"}},
	},
	{
		"Model Version Pin",
		"Prevent deployment of AI model versions not on the approved list",
		"medium", true,
		map[string]any{"approved_versions": []string{"3.2.1", "2.4.0", "1.8.5", "4.1.0"}},
	},
}

// ── Event generation helpers ────────────────────────────────────────────────

var eventTypes = []string{"inference", "policy_check", "model_load", "session_start", "session_end", "bias_scan"}
var actions = []string{
	"generate_response", "classify_intent", "retrieve_knowledge",
	"suggest_reply", "summarize_transcript", "detect_sentiment",
	"route_conversation", "evaluate_compliance", "redact_pii",
}
var outcomes = []string{"allowed", "allowed", "allowed", "allowed", "flagged", "blocked"} // weighted

var policyNames = []string{
	"Confidence Floor",
	"Bias Threshold",
	"Content Safety",
	"PII Redaction",
	"Session Length Limit",
}

func randFloat(min, max float64) float64 {
	return min + rand.Float64()*(max-min)
}

func pickRandom[T any](s []T) T {
	return s[rand.Intn(len(s))]
}

func buildViolations(outcome string) []string {
	if outcome == "blocked" {
		return []string{pickRandom(policyNames)}
	}
	if outcome == "flagged" && rand.Float64() < 0.6 {
		return []string{pickRandom(policyNames)}
	}
	return []string{}
}

// ── Main ─────────────────────────────────────────────────────────────────────

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file, reading environment")
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgresql://postgres:postgres@localhost:5432/ai_trust_center"
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		log.Fatalf("connect to database: %v", err)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		log.Fatalf("ping database: %v\n\nMake sure Docker is running: npm run db:up (from the monorepo root)", err)
	}

	log.Println("Connected to database. Starting seed…")

	if err := seedTenant(ctx, pool); err != nil {
		log.Fatalf("seed tenant: %v", err)
	}
	if err := seedModels(ctx, pool); err != nil {
		log.Fatalf("seed models: %v", err)
	}
	if err := seedPolicies(ctx, pool); err != nil {
		log.Fatalf("seed policies: %v", err)
	}
	if err := seedAuditEvents(ctx, pool); err != nil {
		log.Fatalf("seed audit events: %v", err)
	}

	log.Println("Seed complete.")
	printSummary(ctx, pool)
}

func seedTenant(ctx context.Context, db *pgxpool.Pool) error {
	_, err := db.Exec(ctx,
		`INSERT INTO tenants (id, name) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
		tenantID, "Acme Corp Demo",
	)
	if err != nil {
		return err
	}
	log.Println("  ✓ tenant")
	return nil
}

func seedModels(ctx context.Context, db *pgxpool.Pool) error {
	for _, m := range models {
		_, err := db.Exec(ctx,
			`INSERT INTO ai_models (id, tenant_id, name, type, version, status, governance_score, created_at, updated_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() - INTERVAL '90 days', NOW())
			 ON CONFLICT (id) DO UPDATE SET
				governance_score = EXCLUDED.governance_score,
				status = EXCLUDED.status,
				updated_at = NOW()`,
			m.id, tenantID, m.name, m.modelType, m.version, m.status, m.governanceScore,
		)
		if err != nil {
			return fmt.Errorf("model %s: %w", m.name, err)
		}
	}
	log.Printf("  ✓ %d AI models", len(models))
	return nil
}

func seedPolicies(ctx context.Context, db *pgxpool.Pool) error {
	for _, p := range policies {
		cfg, _ := json.Marshal(p.ruleConfig)
		_, err := db.Exec(ctx,
			`INSERT INTO policies (tenant_id, name, description, severity, enabled, rule_config, created_at, updated_at)
			 VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '60 days', NOW())
			 ON CONFLICT DO NOTHING`,
			tenantID, p.name, p.description, p.severity, p.enabled, cfg,
		)
		if err != nil {
			return fmt.Errorf("policy %s: %w", p.name, err)
		}
	}
	log.Printf("  ✓ %d policies", len(policies))
	return nil
}

func seedAuditEvents(ctx context.Context, db *pgxpool.Pool) error {
	// Generate events across the last 42 days (6 weeks), ~20-80 events per day.
	// Higher volume during business hours. Violations cluster around "bad" models.
	rng := rand.New(rand.NewSource(42)) // deterministic seed for reproducibility
	_ = rng

	now := time.Now()
	total := 0

	batch := &pgxBatch{}

	for day := 42; day >= 0; day-- {
		dayStart := now.AddDate(0, 0, -day).Truncate(24 * time.Hour)
		eventsThisDay := 30 + rand.Intn(60) // 30–90 events/day

		for i := 0; i < eventsThisDay; i++ {
			// Spread events across the day, weighted toward business hours
			hour := businessHour()
			minute := rand.Intn(60)
			second := rand.Intn(60)
			eventTime := dayStart.Add(time.Duration(hour)*time.Hour +
				time.Duration(minute)*time.Minute +
				time.Duration(second)*time.Second)

			modelID := pickRandom(modelIDs)
			eventType := pickRandom(eventTypes)
			action := pickRandom(actions)
			outcome := outcomeForModel(modelID)
			confidence := confidenceForModel(modelID, outcome)
			violations, _ := json.Marshal(buildViolations(outcome))
			agentID := fmt.Sprintf("agent-%03d", rand.Intn(20)+1)
			sessionID := fmt.Sprintf("sess-%08x", rand.Uint32())

			metadata, _ := json.Marshal(map[string]any{
				"latency_ms":    rand.Intn(800) + 50,
				"token_count":   rand.Intn(1500) + 100,
				"region":        pickRandom([]string{"us-east-1", "us-west-2", "eu-west-1"}),
				"channel":       pickRandom([]string{"voice", "chat", "email", "sms"}),
			})

			batch.add(
				`INSERT INTO audit_events
					(tenant_id, event_time, event_type, model_id, agent_id, session_id,
					 action, outcome, confidence_score, policy_violations, metadata)
				 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
				tenantID, eventTime, eventType, modelID, agentID, sessionID,
				action, outcome, confidence, violations, metadata,
			)
			total++

			// Flush every 500 rows
			if total%500 == 0 {
				if err := flushBatch(context.Background(), db, batch); err != nil {
					return err
				}
				batch = &pgxBatch{}
			}
		}
	}

	// Flush remainder
	if len(batch.queries) > 0 {
		if err := flushBatch(context.Background(), db, batch); err != nil {
			return err
		}
	}

	log.Printf("  ✓ %d audit events (42 days of history)", total)
	return nil
}

// outcomeForModel makes "bad" models produce more violations.
func outcomeForModel(modelID string) string {
	switch modelID {
	case "11111111-1111-1111-1111-000000000004": // Copilot — low governance score
		r := rand.Float64()
		if r < 0.15 {
			return "blocked"
		} else if r < 0.35 {
			return "flagged"
		}
		return "allowed"
	case "11111111-1111-1111-1111-000000000002": // Sentiment — warning model
		r := rand.Float64()
		if r < 0.05 {
			return "blocked"
		} else if r < 0.20 {
			return "flagged"
		}
		return "allowed"
	default:
		r := rand.Float64()
		if r < 0.02 {
			return "blocked"
		} else if r < 0.06 {
			return "flagged"
		}
		return "allowed"
	}
}

// confidenceForModel generates realistic confidence distributions per model.
func confidenceForModel(modelID, outcome string) float64 {
	var base, spread float64
	switch modelID {
	case "11111111-1111-1111-1111-000000000001": // Virtual Agent — high confidence
		base, spread = 0.91, 0.07
	case "11111111-1111-1111-1111-000000000002": // Sentiment — moderate
		base, spread = 0.79, 0.12
	case "11111111-1111-1111-1111-000000000003": // Intent Router — high
		base, spread = 0.93, 0.05
	case "11111111-1111-1111-1111-000000000004": // Copilot — low
		base, spread = 0.62, 0.18
	case "11111111-1111-1111-1111-000000000005": // Knowledge — high
		base, spread = 0.88, 0.08
	default:
		base, spread = 0.82, 0.10
	}
	if outcome == "blocked" {
		base -= 0.20
	} else if outcome == "flagged" {
		base -= 0.10
	}
	v := base + (rand.Float64()-0.5)*spread
	if v < 0.01 {
		v = 0.01
	}
	if v > 0.999 {
		v = 0.999
	}
	return v
}

// businessHour returns an hour weighted toward 9-17 UTC.
func businessHour() int {
	r := rand.Float64()
	switch {
	case r < 0.60:
		return 9 + rand.Intn(9) // 09–17
	case r < 0.80:
		return 7 + rand.Intn(3) // 07–09 or 17–20
	default:
		return rand.Intn(24)
	}
}

// ── Minimal batch helper ─────────────────────────────────────────────────────

type pgxBatch struct {
	queries []string
	args    [][]any
}

func (b *pgxBatch) add(sql string, args ...any) {
	b.queries = append(b.queries, sql)
	b.args = append(b.args, args)
}

func flushBatch(ctx context.Context, db *pgxpool.Pool, b *pgxBatch) error {
	tx, err := db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	for i, q := range b.queries {
		if _, err := tx.Exec(ctx, q, b.args[i]...); err != nil {
			return fmt.Errorf("batch exec: %w", err)
		}
	}
	return tx.Commit(ctx)
}

// ── Summary ──────────────────────────────────────────────────────────────────

func printSummary(ctx context.Context, db *pgxpool.Pool) {
	var tenants, aiModels, policyCount, events int64
	db.QueryRow(ctx, `SELECT COUNT(*) FROM tenants`).Scan(&tenants)               //nolint
	db.QueryRow(ctx, `SELECT COUNT(*) FROM ai_models`).Scan(&aiModels)            //nolint
	db.QueryRow(ctx, `SELECT COUNT(*) FROM policies`).Scan(&policyCount)          //nolint
	db.QueryRow(ctx, `SELECT COUNT(*) FROM audit_events`).Scan(&events)           //nolint

	fmt.Println("\n── Database Summary ──────────────────────────────")
	fmt.Printf("  tenants:       %d\n", tenants)
	fmt.Printf("  ai_models:     %d\n", aiModels)
	fmt.Printf("  policies:      %d\n", policyCount)
	fmt.Printf("  audit_events:  %d\n", events)
	fmt.Println("──────────────────────────────────────────────────")
}
