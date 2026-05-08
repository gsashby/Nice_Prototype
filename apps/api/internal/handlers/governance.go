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

// GetMetrics godoc — GET /api/v1/governance/metrics
func (h *GovernanceHandler) GetMetrics(c *fiber.Ctx) error {
	tenantID := c.Query("tenant_id", "00000000-0000-0000-0000-000000000001")

	metrics, err := h.repo.GetMetrics(c.Context(), tenantID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(metrics)
}

// GetModelHealth godoc — GET /api/v1/governance/models
func (h *GovernanceHandler) GetModelHealth(c *fiber.Ctx) error {
	tenantID := c.Query("tenant_id", "00000000-0000-0000-0000-000000000001")

	models, err := h.repo.GetModelHealth(c.Context(), tenantID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"models": models})
}

// GetAlerts godoc — GET /api/v1/governance/alerts
func (h *GovernanceHandler) GetAlerts(c *fiber.Ctx) error {
	tenantID := c.Query("tenant_id", "00000000-0000-0000-0000-000000000001")

	alerts, err := h.repo.GetAlerts(c.Context(), tenantID, 20)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"alerts": alerts})
}
