package main

import (
	"context"
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	fiberlogger "github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/joho/godotenv"

	"github.com/nice-cx/ai-trust-center/api/internal/config"
	"github.com/nice-cx/ai-trust-center/api/internal/handlers"
	"github.com/nice-cx/ai-trust-center/api/internal/repository"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file, using environment variables")
	}

	cfg := config.Load()

	// ── Database connection ──────────────────────────────────────────────
	ctx := context.Background()
	pool, err := repository.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Database connection failed: %v\n\nMake sure Docker is running: npm run db:up", err)
	}
	defer pool.Close()
	log.Println("Connected to PostgreSQL")

	// ── Repositories ────────────────────────────────────────────────────
	governanceRepo := repository.NewGovernanceRepo(pool)
	auditRepo := repository.NewAuditRepo(pool)
	policyRepo := repository.NewPolicyRepo(pool)

	// ── Handlers ────────────────────────────────────────────────────────
	governanceHandler := handlers.NewGovernanceHandler(governanceRepo)
	auditHandler := handlers.NewAuditLogHandler(auditRepo)
	policyHandler := handlers.NewPolicyHandler(policyRepo)

	// ── Fiber app ───────────────────────────────────────────────────────
	app := fiber.New(fiber.Config{
		AppName: "AI Trust Center API v1.0",
	})

	app.Use(recover.New())
	app.Use(fiberlogger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.AllowedOrigins,
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		AllowMethods:     "GET,POST,PUT,PATCH,DELETE,OPTIONS",
		AllowCredentials: true,
	}))

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok", "service": "ai-trust-center-api"})
	})

	// ── API v1 ───────────────────────────────────────────────────────────
	v1 := app.Group("/api/v1")

	// Governance
	v1.Get("/governance/metrics", governanceHandler.GetMetrics)
	v1.Get("/governance/models", governanceHandler.GetModelHealth)
	v1.Get("/governance/alerts", governanceHandler.GetAlerts)

	// Audit Log
	v1.Get("/audit-log", auditHandler.List)

	// Policy Engine
	v1.Get("/policies", policyHandler.List)
	v1.Post("/policies", policyHandler.Create)
	v1.Patch("/policies/:id/toggle", policyHandler.ToggleEnabled)

	log.Printf("API server starting on :%s", cfg.APIPort)
	log.Fatal(app.Listen(":" + cfg.APIPort))
}
