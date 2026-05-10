package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/nice-cx/ai-trust-center/api/internal/repository"
)

type GovernanceHandler struct {
	repo *repository.GovernanceRepo
}

func NewGovernanceHandler(repo *repository.GovernanceRepo) *GovernanceHandler {
	return &GovernanceHandler{repo: repo}
}

// GetMetrics godoc — GET /api/v1/governance/metrics?days=7
func (h *GovernanceHandler) GetMetrics(c *fiber.Ctx) error {
	tenantID := c.Query("tenant_id", "00000000-0000-0000-0000-000000000001")
	days := c.QueryInt("days", 7)
	if days <= 0 {
		days = 7
	}

	metrics, err := h.repo.GetMetrics(c.Context(), tenantID, days)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(metrics)
}

// GetModelHealth godoc — GET /api/v1/governance/models?days=7
func (h *GovernanceHandler) GetModelHealth(c *fiber.Ctx) error {
	tenantID := c.Query("tenant_id", "00000000-0000-0000-0000-000000000001")
	days := c.QueryInt("days", 7)
	if days <= 0 {
		days = 7
	}

	models, err := h.repo.GetModelHealth(c.Context(), tenantID, days)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"models": models})
}

// GetAlerts godoc — GET /api/v1/governance/alerts?days=7
func (h *GovernanceHandler) GetAlerts(c *fiber.Ctx) error {
	tenantID := c.Query("tenant_id", "00000000-0000-0000-0000-000000000001")
	days := c.QueryInt("days", 7)
	if days <= 0 {
		days = 7
	}

	alerts, err := h.repo.GetAlerts(c.Context(), tenantID, 20, days)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"alerts": alerts})
}
