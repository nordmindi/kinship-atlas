import { QueryClient } from '@tanstack/react-query';

/**
 * Configured QueryClient with sensible defaults
 * 
 * Defaults:
 * - staleTime: 5 minutes - Data is considered fresh for 5 minutes
 * - gcTime: 10 minutes - Unused data is garbage collected after 10 minutes
 * - refetchOnWindowFocus: Only refetch if data is stale (prevents unnecessary loading states)
 * - refetchOnReconnect: true - Refetch when network reconnects
 * - retry: 1 - Retry failed requests once
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      // Disable refetch on window focus to prevent loading state issues
      // Data will still be refetched when it becomes stale or on manual refresh
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 1,
      refetchOnMount: true,
    },
    mutations: {
      retry: 0, // Don't retry mutations by default
    },
  },
});

