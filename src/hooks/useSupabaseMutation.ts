import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
  type QueryKey,
} from '@tanstack/react-query'

interface UseSupabaseMutationOptions<TData, TVariables, TContext = unknown> {
  /**
   * The async function that performs the Supabase mutation.
   * Receives the variables passed to `mutate()` / `mutateAsync()`.
   */
  mutationFn: (variables: TVariables) => PromiseLike<{ data: TData | null; error: { message: string } | null }>

  /**
   * Query keys to invalidate after a successful mutation.
   * Accepts both exact keys and partial key prefixes.
   */
  invalidateKeys?: QueryKey[]

  /**
   * Called before the mutation fires. Return a context value that will be
   * passed to `onError` and `onSettled` for rollback purposes.
   */
  onMutate?: (variables: TVariables) => Promise<TContext> | TContext

  /**
   * Called when the mutation fails. Use the context returned by `onMutate`
   * to roll back optimistic updates.
   */
  onError?: (error: Error, variables: TVariables, context: TContext | undefined) => void

  /**
   * Called when the mutation succeeds.
   */
  onSuccess?: (data: TData, variables: TVariables, context: TContext | undefined) => void

  /**
   * Called when the mutation settles (success or failure).
   */
  onSettled?: (
    data: TData | undefined,
    error: Error | null,
    variables: TVariables,
    context: TContext | undefined,
  ) => void
}

/**
 * Generic mutation hook that wraps Supabase insert/update/delete operations
 * with React Query's mutation lifecycle.
 *
 * Handles the Supabase error format (errors are returned in the response, not
 * thrown) and automatically invalidates related queries on success.
 *
 * @example Simple insert
 * ```ts
 * const createAvvik = useSupabaseMutation({
 *   mutationFn: (newAvvik: Partial<Avvik>) =>
 *     supabase.from('avvik').insert(newAvvik).select().single(),
 *   invalidateKeys: [['avvik']],
 * })
 *
 * createAvvik.mutate({ property_id: '...', description: '...' })
 * ```
 */
export function useSupabaseMutation<TData, TVariables, TContext = unknown>(
  options: UseSupabaseMutationOptions<TData, TVariables, TContext>,
) {
  const queryClient = useQueryClient()

  const { mutationFn, invalidateKeys, onMutate, onError, onSuccess, onSettled } = options

  const mutationOptions: UseMutationOptions<TData, Error, TVariables, TContext> = {
    mutationFn: async (variables: TVariables) => {
      const { data, error } = await mutationFn(variables)

      if (error) {
        throw new Error(error.message)
      }

      return data as TData
    },

    onMutate,

    onSuccess: (data, variables, context) => {
      onSuccess?.(data, variables, context)

      if (invalidateKeys) {
        for (const key of invalidateKeys) {
          void queryClient.invalidateQueries({ queryKey: key })
        }
      }
    },

    onError,
    onSettled,
  }

  return useMutation(mutationOptions)
}
