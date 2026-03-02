import { db, type SyncQueueItem } from '@/lib/offline-db'
import { supabase } from '@/lib/supabase'

const MAX_RETRIES = 5

// ---------------------------------------------------------------------------
// Enqueue a mutation for later sync
// ---------------------------------------------------------------------------
export async function enqueue(
  item: Omit<SyncQueueItem, 'id' | 'createdAt' | 'retries'>,
): Promise<string> {
  const id = crypto.randomUUID()
  await db.syncQueue.add({
    ...item,
    id,
    createdAt: new Date().toISOString(),
    retries: 0,
  })
  return id
}

// ---------------------------------------------------------------------------
// Process the entire queue in FIFO order
// ---------------------------------------------------------------------------
export async function processQueue(): Promise<{
  processed: number
  failed: number
}> {
  const items = await db.syncQueue
    .where('retries')
    .below(MAX_RETRIES)
    .sortBy('createdAt')

  let processed = 0
  let failed = 0

  for (const item of items) {
    try {
      await executeSupabaseOperation(item)
      await db.syncQueue.delete(item.id)
      processed++
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error'
      const nextRetries = item.retries + 1

      await db.syncQueue.update(item.id, {
        retries: nextRetries,
        lastError: errorMessage,
      })

      if (nextRetries >= MAX_RETRIES) {
        failed++
      }
    }
  }

  return { processed, failed }
}

// ---------------------------------------------------------------------------
// Execute a single Supabase operation from a queue item
// ---------------------------------------------------------------------------
async function executeSupabaseOperation(item: SyncQueueItem): Promise<void> {
  const { table, operation, payload } = item

  let result: { error: { message: string } | null }

  switch (operation) {
    case 'insert':
      result = await supabase.from(table).insert(payload)
      break

    case 'update': {
      const { id, ...rest } = payload
      if (!id) throw new Error(`Update operation missing 'id' in payload`)
      result = await supabase.from(table).update(rest).eq('id', id as string)
      break
    }

    case 'delete': {
      const deleteId = payload.id
      if (!deleteId) throw new Error(`Delete operation missing 'id' in payload`)
      result = await supabase.from(table).delete().eq('id', deleteId as string)
      break
    }

    default:
      throw new Error(`Unknown operation: ${operation}`)
  }

  if (result.error) {
    throw new Error(result.error.message)
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Number of items still waiting to be synced (retries < MAX_RETRIES). */
export async function getQueueSize(): Promise<number> {
  return db.syncQueue.where('retries').below(MAX_RETRIES).count()
}

/** Items that have exceeded the retry limit. */
export async function getFailedItems(): Promise<SyncQueueItem[]> {
  return db.syncQueue
    .where('retries')
    .aboveOrEqual(MAX_RETRIES)
    .sortBy('createdAt')
}

/** Remove everything from the sync queue (admin / debug). */
export async function clearQueue(): Promise<void> {
  await db.syncQueue.clear()
}
