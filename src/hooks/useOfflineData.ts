import { useState, useEffect, useCallback, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'

import { db } from '@/lib/offline-db'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import type { Table } from 'dexie'

// Tables available in the offline DB, narrowed for type safety.
type OfflineTableName = keyof Pick<
  typeof db,
  | 'properties'
  | 'assignments'
  | 'instructions'
  | 'taskExecutions'
  | 'avvik'
  | 'photos'
  | 'timeLogs'
  | 'ns3451Codes'
>

/** Type-safe accessor — routes through `unknown` to satisfy strict generics. */
function getTable<T>(name: OfflineTableName): Table<T, string> {
  return db[name] as unknown as Table<T, string>
}

interface UseOfflineDataOptions {
  /** How often (ms) to re-fetch from Supabase while online. Default: no polling. */
  syncInterval?: number
}

interface UseOfflineDataReturn<T> {
  data: T[]
  isLoading: boolean
  /** True if we are serving cached data because the last Supabase fetch failed. */
  isStale: boolean
  /** Force a fresh fetch from Supabase and update the local cache. */
  refresh: () => Promise<void>
}

/**
 * Hook that keeps a Dexie table in sync with a Supabase query.
 *
 * - On mount: immediately returns cached data from IndexedDB.
 * - If online: also fetches from Supabase, updates the cache, and returns fresh data.
 * - If offline: returns cached data and sets `isStale = true`.
 * - `refresh()` forces a Supabase fetch + cache update.
 *
 * @param table  Name of the Dexie table (must match a table in CoorOfflineDB).
 * @param supabaseQuery  An async function that returns rows from Supabase.
 * @param options  Optional configuration (syncInterval, etc.).
 */
export function useOfflineData<T extends { id: string }>(
  table: OfflineTableName,
  supabaseQuery: () => Promise<T[]>,
  options?: UseOfflineDataOptions,
): UseOfflineDataReturn<T> {
  const { isOnline } = useOnlineStatus()

  const [isLoading, setIsLoading] = useState(true)
  const [isStale, setIsStale] = useState(false)

  // Keep the supabaseQuery ref stable so the effect doesn't re-run on every render
  const queryRef = useRef(supabaseQuery)
  queryRef.current = supabaseQuery

  // Dexie live query — reactively returns all rows in the table
  const cachedData =
    (useLiveQuery(
      () => getTable<T>(table).toArray(),
      [table],
    ) as T[] | undefined) ?? []

  // Fetch from Supabase and replace the local cache
  const fetchAndCache = useCallback(async () => {
    try {
      const rows = await queryRef.current()
      const dexieTable = getTable<T>(table)

      // Bulk-replace the table contents inside a transaction
      await db.transaction('rw', dexieTable, async () => {
        await dexieTable.clear()
        await dexieTable.bulkAdd(rows)
      })

      setIsStale(false)
    } catch {
      // If we already have cached data, mark it as stale rather than crashing
      setIsStale(true)
    }
  }, [table])

  // On mount + when online status changes: attempt a Supabase fetch
  useEffect(() => {
    let cancelled = false

    async function sync() {
      setIsLoading(true)
      if (isOnline) {
        await fetchAndCache()
      } else {
        setIsStale(true)
      }
      if (!cancelled) setIsLoading(false)
    }

    void sync()
    return () => {
      cancelled = true
    }
  }, [isOnline, fetchAndCache])

  // Optional polling interval
  useEffect(() => {
    if (!options?.syncInterval || !isOnline) return

    const id = setInterval(() => {
      void fetchAndCache()
    }, options.syncInterval)

    return () => clearInterval(id)
  }, [options?.syncInterval, isOnline, fetchAndCache])

  // Public refresh — always tries Supabase regardless of online state
  const refresh = useCallback(async () => {
    setIsLoading(true)
    await fetchAndCache()
    setIsLoading(false)
  }, [fetchAndCache])

  return {
    data: cachedData,
    isLoading,
    isStale,
    refresh,
  }
}
