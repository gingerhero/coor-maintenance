import {
  useQuery,
  type UseQueryOptions,
  type QueryKey,
} from '@tanstack/react-query'
import type { PostgrestBuilder } from '@supabase/postgrest-js'

/**
 * Extracts the resolved data type from a Supabase PostgREST builder.
 *
 * Works with `.select()`, `.select().single()`, `.rpc()`, etc.
 */
type SupabaseQueryResult<T> = T extends PostgrestBuilder<infer R> ? R : never

/**
 * Generic hook that bridges a Supabase PostgREST query with React Query.
 *
 * It executes the builder, checks for Supabase-level errors (which are NOT
 * thrown by default), and surfaces them so React Query can handle retries,
 * error boundaries, etc.
 *
 * @example
 * ```ts
 * const { data, isLoading } = useSupabaseQuery(
 *   ['properties'],
 *   () => supabase.from('properties').select('*'),
 * )
 * ```
 *
 * @example With extra React Query options
 * ```ts
 * const { data } = useSupabaseQuery(
 *   ['ns3451-codes'],
 *   () => supabase.from('ns3451_codes').select('*'),
 *   { staleTime: Infinity },
 * )
 * ```
 */
export function useSupabaseQuery<
  TQueryKey extends QueryKey,
  TBuilder extends PostgrestBuilder<unknown>,
>(
  queryKey: TQueryKey,
  queryFn: () => TBuilder,
  options?: Omit<
    UseQueryOptions<SupabaseQueryResult<TBuilder>, Error, SupabaseQueryResult<TBuilder>, TQueryKey>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery<SupabaseQueryResult<TBuilder>, Error, SupabaseQueryResult<TBuilder>, TQueryKey>({
    queryKey,
    queryFn: async () => {
      const { data, error } = await queryFn()

      if (error) {
        throw new Error(error.message)
      }

      return data as SupabaseQueryResult<TBuilder>
    },
    ...options,
  })
}
