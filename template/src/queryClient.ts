import { QueryClient } from '@tanstack/react-query';

import { HttpError } from '@/api';

/** Retry network hiccups and server errors, but not 4xx: those won't fix themselves. */
export function shouldRetry(failureCount: number, error: Error) {
  if (error instanceof HttpError && error.status >= 400 && error.status < 500) return false;
  return failureCount < 2;
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000, // personal apps rarely need refetch-on-every-focus
        retry: shouldRetry,
      },
    },
  });
}
