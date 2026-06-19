import { QueryClient } from '@tanstack/react-query';
import { ApiRequestError } from '@/lib/api/client';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      // Never retry on 401 — the token is invalid and retrying just causes
      // a 401 storm. The client.ts apiFetch already does one refresh+retry
      // internally, so if it still throws 401 the session is truly gone.
      retry: (failureCount, error) => {
        if (error instanceof ApiRequestError && error.statusCode === 401) {
          return false;
        }
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
    },
  },
});
