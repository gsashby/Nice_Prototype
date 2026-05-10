import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api-client';
import type { GovernanceMetrics } from '@/types/governance';

export function useGovernanceMetrics(days = 7) {
  return useQuery({
    queryKey: ['governance', 'metrics', days],
    queryFn: () => apiGet<GovernanceMetrics>(`/api/v1/governance/metrics?days=${days}`),
  });
}
