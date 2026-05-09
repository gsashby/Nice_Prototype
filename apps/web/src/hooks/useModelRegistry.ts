import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api-client';

export type RegistryModel = {
  id: string;
  tenant_id?: string;
  name: string;
  type: string;
  version: string;
  status: 'active' | 'inactive';
  governance_score: number;
  bias_score: number;
  confidence_avg: number;
  total_inferences: number;
  violation_count: number;
  created_at?: string;
  updated_at?: string;
};

export type RegisterModelRequest = {
  name: string;
  type: string;
  version: string;
  status: 'active' | 'inactive';
};

export function useModelRegistry() {
  return useQuery({
    queryKey: ['governance', 'models'],
    queryFn: () =>
      apiGet<{ models: RegistryModel[] }>('/api/v1/governance/models').then((r) => r.models),
    refetchInterval: 60_000,
  });
}

export function useRegisterModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (model: RegisterModelRequest) =>
      apiPost<RegistryModel>('/api/v1/models', model),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['governance', 'models'] }),
  });
}
