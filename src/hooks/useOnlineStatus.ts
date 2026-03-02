import { useState, useEffect, useRef, useCallback } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseOnlineStatusReturn {
  /** `true` when the browser reports network connectivity. */
  isOnline: boolean
  /**
   * `true` after the device went offline and subsequently came back online.
   * Consumers can use this flag to trigger a sync-queue replay, then call
   * `clearWasOffline()` to reset it.
   */
  wasOffline: boolean
  /** Manually reset the `wasOffline` flag (e.g. after sync completes). */
  clearWasOffline: () => void
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Tracks browser connectivity via `navigator.onLine` and the `online` /
 * `offline` window events.
 *
 * Exposes a `wasOffline` flag that becomes `true` when the device transitions
 * from offline back to online, which is a natural trigger for replaying
 * queued mutations.
 *
 * @example
 * ```ts
 * const { isOnline, wasOffline, clearWasOffline } = useOnlineStatus()
 *
 * useEffect(() => {
 *   if (wasOffline && isOnline) {
 *     replaySyncQueue().then(() => clearWasOffline())
 *   }
 * }, [wasOffline, isOnline])
 * ```
 */
export function useOnlineStatus(): UseOnlineStatusReturn {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )
  const [wasOffline, setWasOffline] = useState(false)

  // Track whether the device has gone offline during this session so we can
  // flip `wasOffline` on the next `online` event.
  const wentOfflineRef = useRef(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      if (wentOfflineRef.current) {
        setWasOffline(true)
        wentOfflineRef.current = false
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
      wentOfflineRef.current = true
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const clearWasOffline = useCallback(() => {
    setWasOffline(false)
  }, [])

  return { isOnline, wasOffline, clearWasOffline }
}
