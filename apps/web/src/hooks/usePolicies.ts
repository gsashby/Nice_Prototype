import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api-client';
import type { Policy, CreatePolicyRequest } from '@/types/policy';

export function usePolicies() {
  return useQuery({
    queryKey: ['policies'],
    queryFn: () =>
      apiGet<{ policies: Policy[] }>('/api/v1/policies').then((r) => r.policies),
  });
}

export function useCreatePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (policy: CreatePolicyRequest) =>
      apiPost<Policy>('/api/v1/policies', policy),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['policies'] }),
  });
}
