import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,        // 30s — governance data refreshes frequently
      refetchOnWindowFocus: true,
      retry: 2,
    },
  },
});
