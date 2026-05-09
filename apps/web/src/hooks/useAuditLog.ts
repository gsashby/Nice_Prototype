import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api-client';
import type { AuditEvent, AuditLogFilters } from '@/types/audit';

type AuditLogResponse = {
  events: AuditEvent[];
  total: number;
  page: number;
  page_size: number;
};

export function useAuditLog(filters: AuditLogFilters) {
  const params = new URLSearchParams({
    page: String(filters.page),
    page_size: String(filters.pageSize),
    ...(filters.startDate && { start_date: filters.startDate }),
    ...(filters.endDate && { end_date: filters.endDate }),
    ...(filters.eventType && { event_type: filters.eventType }),
    ...(filters.outcome && { outcome: filters.outcome }),
    ...(filters.modelId && { model_id: filters.modelId }),
    ...(filters.search && { search: filters.search }),
  });

  return useQuery({
    queryKey: ['audit-log', filters],
    queryFn: () => apiGet<AuditLogResponse>(`/api/v1/audit-log?${params}`),
    placeholderData: (prev) => prev,
  });
}
