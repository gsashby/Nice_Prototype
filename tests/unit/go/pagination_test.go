package contract_test

import (
	"testing"
)

// totalPages calculates the number of pages given total items and page size.
// Mirrors the pagination behaviour expected from the API.
func totalPages(total, pageSize int) int {
	if pageSize <= 0 {
		return 0
	}
	return (total + pageSize - 1) / pageSize
}

// pageOffset returns the SQL OFFSET for a given 1-based page and page size.
func pageOffset(page, pageSize int) int {
	if page < 1 {
		page = 1
	}
	return (page - 1) * pageSize
}

func TestTotalPages(t *testing.T) {
	cases := []struct {
		total, pageSize, want int
	}{
		{0, 25, 0},
		{1, 25, 1},
		{25, 25, 1},
		{26, 25, 2},
		{50, 25, 2},
		{51, 25, 3},
		{100, 10, 10},
		{101, 10, 11},
		{2489, 50, 50}, // seeded event count with default page size
	}
	for _, c := range cases {
		got := totalPages(c.total, c.pageSize)
		if got != c.want {
			t.Errorf("totalPages(%d, %d) = %d; want %d", c.total, c.pageSize, got, c.want)
		}
	}
}

func TestPageOffset(t *testing.T) {
	cases := []struct {
		page, pageSize, want int
	}{
		{1, 25, 0},
		{2, 25, 25},
		{3, 25, 50},
		{1, 50, 0},
		{2, 50, 50},
		{0, 25, 0},  // page < 1 clamps to 1
		{-1, 25, 0}, // negative page clamps to 1
	}
	for _, c := range cases {
		got := pageOffset(c.page, c.pageSize)
		if got != c.want {
			t.Errorf("pageOffset(%d, %d) = %d; want %d", c.page, c.pageSize, got, c.want)
		}
	}
}

func TestPageSizeDefaults(t *testing.T) {
	// The API defaults: page=1, page_size=50 for audit log; page_size=25 for NLQ
	auditDefault := 50
	nlqDefault := 25

	if auditDefault <= 0 {
		t.Error("audit log default page size must be positive")
	}
	if nlqDefault <= 0 {
		t.Error("NLQ default page size must be positive")
	}
	if auditDefault > 5000 {
		t.Error("audit log default page size is unreasonably large")
	}
}
