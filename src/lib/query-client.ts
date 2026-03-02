import { QueryClient } from '@tanstack/react-query'

/**
 * Shared QueryClient instance with defaults tuned for a mobile maintenance app.
 *
 * - staleTime 5 min  : workers revisit the same properties/assignments often
 * - gcTime   30 min  : keep unused cache around while on-site
 * - retry    1       : one retry is enough on spotty mobile connections
 * - refetchOnWindowFocus: re-sync when app regains focus (tab switch, lock screen)
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: 1,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0,
    },
  },
})
