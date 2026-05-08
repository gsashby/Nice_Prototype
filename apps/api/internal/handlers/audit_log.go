package handlers

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/nice-cx/ai-trust-center/api/internal/models"
	"github.com/nice-cx/ai-trust-center/api/internal/repository"
)

type AuditLogHandler struct {
	repo *repository.AuditRepo
}

func NewAuditLogHandler(repo *repository.AuditRepo) *AuditLogHandler {
	return &AuditLogHandler{repo: repo}
}

// List godoc — GET /api/v1/audit-log
func (h *AuditLogHandler) List(c *fiber.Ctx) error {
	tenantID := c.Query("tenant_id", "00000000-0000-0000-0000-000000000001")

	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("page_size", "50"))

	filter := models.AuditLogFilter{
		StartDate: c.Query("start_date"),
		EndDate:   c.Query("end_date"),
		EventType: c.Query("event_type"),
		Outcome:   c.Query("outcome"),
		ModelID:   c.Query("model_id"),
		Search:    c.Query("search"),
		Page:      page,
		PageSize:  pageSize,
	}

	result, err := h.repo.List(c.Context(), tenantID, filter)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(result)
}
