import { useState, useEffect, useRef, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'

import { db } from '@/lib/offline-db'
import { processQueue, getFailedItems } from '@/lib/sync-queue'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

const MAX_RETRIES = 5

export interface UseOfflineSyncReturn {
  /** Number of items waiting to be synced (excluding permanently failed). */
  queueSize: number
  /** True while the queue is being processed against Supabase. */
  isSyncing: boolean
  /** Timestamp of the last successful sync run (null if never synced). */
  lastSyncAt: Date | null
  /** Manually trigger queue processing. */
  syncNow: () => Promise<void>
  /** Number of items that have exceeded the retry limit. */
  failedCount: number
}

export function useOfflineSync(): UseOfflineSyncReturn {
  const { isOnline } = useOnlineStatus()
  const wasOfflineRef = useRef(!isOnline)

  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null)
  const [failedCount, setFailedCount] = useState(0)

  // Reactive queue size via Dexie live query (pending items only)
  const queueSize =
    useLiveQuery(
      () => db.syncQueue.where('retries').below(MAX_RETRIES).count(),
      [],
    ) ?? 0

  // Core sync function
  const syncNow = useCallback(async () => {
    if (isSyncing) return

    setIsSyncing(true)
    try {
      await processQueue()
      setLastSyncAt(new Date())

      // Refresh failed count
      const failed = await getFailedItems()
      setFailedCount(failed.length)
    } finally {
      setIsSyncing(false)
    }
  }, [isSyncing])

  // Auto-sync when connectivity is restored (offline -> online transition)
  useEffect(() => {
    if (isOnline && wasOfflineRef.current) {
      // We just came back online — flush the queue
      void syncNow()
    }
    wasOfflineRef.current = !isOnline
  }, [isOnline, syncNow])

  // Refresh failed count on mount
  useEffect(() => {
    void getFailedItems().then((items) => setFailedCount(items.length))
  }, [])

  return {
    queueSize,
    isSyncing,
    lastSyncAt,
    syncNow,
    failedCount,
  }
}
