import { useEffect, useRef } from 'react'
import { useQueryClient, type QueryKey } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type {
  RealtimePostgresChangesPayload,
  REALTIME_POSTGRES_CHANGES_LISTEN_EVENT,
  RealtimeChannel,
} from '@supabase/supabase-js'

type PostgresChangeEvent = `${REALTIME_POSTGRES_CHANGES_LISTEN_EVENT}`

interface UseRealtimeSubscriptionOptions<T extends Record<string, unknown>> {
  /**
   * The Postgres table to subscribe to (e.g. 'properties', 'avvik').
   */
  table: string

  /**
   * The database schema. Defaults to 'public'.
   */
  schema?: string

  /**
   * Which events to listen for. Defaults to all ('*').
   */
  event?: PostgresChangeEvent

  /**
   * Optional Postgres filter expression (e.g. 'property_id=eq.abc-123').
   */
  filter?: string

  /**
   * Query keys to invalidate when a change arrives.
   * If not provided, the table name is used as a single-element key.
   */
  invalidateKeys?: QueryKey[]

  /**
   * Optional callback invoked with the raw change payload.
   * Useful for toasts, logging, or fine-grained cache updates.
   */
  onPayload?: (payload: RealtimePostgresChangesPayload<T>) => void

  /**
   * Whether the subscription is active. Defaults to true.
   * Pass `false` to temporarily disable without unmounting.
   */
  enabled?: boolean
}

/**
 * Subscribes to Supabase Realtime Postgres changes and automatically
 * invalidates React Query cache entries when the table changes.
 *
 * The subscription is cleaned up on unmount or when dependencies change.
 *
 * @example
 * ```ts
 * // Invalidate the properties list whenever the table changes
 * useRealtimeSubscription<Property>({
 *   table: 'properties',
 *   invalidateKeys: [['properties']],
 * })
 * ```
 *
 * @example With a filter and callback
 * ```ts
 * useRealtimeSubscription<Avvik>({
 *   table: 'avvik',
 *   filter: `property_id=eq.${propertyId}`,
 *   invalidateKeys: [['avvik', propertyId]],
 *   onPayload: (payload) => {
 *     if (payload.eventType === 'INSERT') {
 *       toast.info('Nytt avvik registrert')
 *     }
 *   },
 * })
 * ```
 */
export function useRealtimeSubscription<T extends Record<string, unknown>>(
  options: UseRealtimeSubscriptionOptions<T>,
) {
  const {
    table,
    schema = 'public',
    event = '*',
    filter,
    invalidateKeys,
    onPayload,
    enabled = true,
  } = options

  const queryClient = useQueryClient()
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!enabled) return

    const channelName = filter
      ? `realtime:${schema}:${table}:${filter}`
      : `realtime:${schema}:${table}`

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as const,
        {
          event,
          schema,
          table,
          ...(filter ? { filter } : {}),
        },
        (payload: RealtimePostgresChangesPayload<T>) => {
          // Invalidate related queries
          const keys = invalidateKeys ?? [[table]]
          for (const key of keys) {
            void queryClient.invalidateQueries({ queryKey: key })
          }

          // Fire optional callback
          onPayload?.(payload)
        },
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      void supabase.removeChannel(channel)
      channelRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, schema, event, filter, enabled])
}
