import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api-client';

export type ModelHealth = {
  id: string;
  name: string;
  type: string;
  status: string;
  governance_score: number;
  bias_score: number;
  confidence_avg: number;
  total_inferences: number;
  violation_count: number;
};

export function useModelHealth() {
  return useQuery({
    queryKey: ['governance', 'models'],
    queryFn: () => apiGet<{ models: ModelHealth[] }>('/api/v1/governance/models'),
    refetchInterval: 30_000,
  });
}
