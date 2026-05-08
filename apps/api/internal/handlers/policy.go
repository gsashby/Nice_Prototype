package handlers

import (
	"github.com/gofiber/fiber/v2"
	"github.com/nice-cx/ai-trust-center/api/internal/models"
	"github.com/nice-cx/ai-trust-center/api/internal/repository"
)

type PolicyHandler struct {
	repo *repository.PolicyRepo
}

func NewPolicyHandler(repo *repository.PolicyRepo) *PolicyHandler {
	return &PolicyHandler{repo: repo}
}

// List godoc — GET /api/v1/policies
func (h *PolicyHandler) List(c *fiber.Ctx) error {
	tenantID := c.Query("tenant_id", "00000000-0000-0000-0000-000000000001")

	policies, err := h.repo.List(c.Context(), tenantID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"policies": policies})
}

// Create godoc — POST /api/v1/policies
func (h *PolicyHandler) Create(c *fiber.Ctx) error {
	tenantID := c.Query("tenant_id", "00000000-0000-0000-0000-000000000001")

	var req models.CreatePolicyRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid request body"})
	}
	if req.Name == "" {
		return c.Status(400).JSON(fiber.Map{"error": "name is required"})
	}
	validSeverities := map[string]bool{"critical": true, "high": true, "medium": true, "low": true}
	if !validSeverities[req.Severity] {
		return c.Status(400).JSON(fiber.Map{"error": "severity must be critical|high|medium|low"})
	}

	policy, err := h.repo.Create(c.Context(), tenantID, req)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(201).JSON(policy)
}

// ToggleEnabled godoc — PATCH /api/v1/policies/:id/toggle
func (h *PolicyHandler) ToggleEnabled(c *fiber.Ctx) error {
	tenantID := c.Query("tenant_id", "00000000-0000-0000-0000-000000000001")
	policyID := c.Params("id")

	var body struct {
		Enabled bool `json:"enabled"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid request body"})
	}

	if err := h.repo.ToggleEnabled(c.Context(), policyID, tenantID, body.Enabled); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"ok": true})
}
