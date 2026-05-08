import { useMutation, useQuery } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api-client';

type NlqRequest = { query: string; tenant_id: string };
type NlqResponse = { sql: string; explanation: string; results: Record<string, unknown>[] };

export function useNlqQuery() {
  return useMutation({
    mutationFn: (req: NlqRequest) =>
      apiPost<NlqResponse>(
        `${process.env.NEXT_PUBLIC_AI_SERVICES_URL ?? 'http://localhost:8001'}/api/v1/ai/nlq/query`,
        req
      ),
  });
}

export function useNlqSuggestions() {
  return useQuery({
    queryKey: ['nlq', 'suggestions'],
    queryFn: () =>
      apiGet<{ suggestions: string[] }>(
        `${process.env.NEXT_PUBLIC_AI_SERVICES_URL ?? 'http://localhost:8001'}/api/v1/ai/nlq/suggestions`
      ),
    staleTime: 5 * 60_000,
  });
}
