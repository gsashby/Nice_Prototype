import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPatch, apiPut, apiDelete } from '@/lib/api-client';
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

export function useUpdatePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...policy }: { id: string } & CreatePolicyRequest) =>
      apiPut<Policy>(`/api/v1/policies/${id}`, policy),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['policies'] }),
  });
}

export function useDeletePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/api/v1/policies/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['policies'] }),
  });
}

export function useTogglePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      apiPatch(`/api/v1/policies/${id}/toggle`, { enabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['policies'] }),
  });
}
