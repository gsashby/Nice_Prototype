import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api-client';

export type LiveAlert = {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  timestamp: string;
};

export function useAlerts(days = 7) {
  return useQuery({
    queryKey: ['governance', 'alerts', days],
    queryFn: () => apiGet<{ alerts: LiveAlert[] }>(`/api/v1/governance/alerts?days=${days}`),
    refetchInterval: 15_000,
  });
}
