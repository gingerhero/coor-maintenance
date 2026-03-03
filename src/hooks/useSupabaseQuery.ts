import {
  useQuery,
  type UseQueryOptions,
  type QueryKey,
} from '@tanstack/react-query'

/**
 * Strips the Supabase SDK v2.98+ error union type from query results.
 *
 * When using `.single().returns<T>()`, the SDK creates a union:
 *   `T | { Error: "Type mismatch: ..." }`
 * This utility type removes the error variant so consumers see just `T`.
 */
type CleanResult<T> = T extends { Error: string } ? never : T

/**
 * Generic hook that bridges a Supabase PostgREST query with React Query.
 *
 * Uses a structural type constraint (`PromiseLike`) so it works with any
 * Supabase builder (PostgrestBuilder, PostgrestTransformBuilder, etc.)
 * regardless of the SDK version's generic parameter count.
 *
 * @example
 * ```ts
 * const { data, isLoading } = useSupabaseQuery(
 *   ['properties'],
 *   () => supabase.from('properties').select('*').returns<Property[]>(),
 * )
 * ```
 */
export function useSupabaseQuery<
  TQueryKey extends QueryKey,
  TData,
>(
  queryKey: TQueryKey,
  queryFn: () => PromiseLike<{ data: TData | null; error: { message: string } | null }>,
  options?: Omit<
    UseQueryOptions<CleanResult<TData>, Error, CleanResult<TData>, TQueryKey>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery<CleanResult<TData>, Error, CleanResult<TData>, TQueryKey>({
    queryKey,
    queryFn: async () => {
      const { data, error } = await queryFn()

      if (error) {
        throw new Error(error.message)
      }

      return data as CleanResult<TData>
    },
    ...options,
  })
}
