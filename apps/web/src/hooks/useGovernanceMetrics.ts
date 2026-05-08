import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api-client';
import type { GovernanceMetrics } from '@/types/governance';

export function useGovernanceMetrics() {
  return useQuery({
    queryKey: ['governance', 'metrics'],
    queryFn: () => apiGet<GovernanceMetrics>('/api/v1/governance/metrics'),
  });
}
