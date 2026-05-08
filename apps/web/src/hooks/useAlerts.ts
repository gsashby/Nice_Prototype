import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api-client';

export type LiveAlert = {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  timestamp: string;
};

export function useAlerts() {
  return useQuery({
    queryKey: ['governance', 'alerts'],
    queryFn: () => apiGet<{ alerts: LiveAlert[] }>('/api/v1/governance/alerts'),
    refetchInterval: 15_000,
  });
}
