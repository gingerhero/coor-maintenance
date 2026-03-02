import { useState, useEffect, useRef, useCallback } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GPSPosition {
  latitude: number
  longitude: number
  accuracy: number // meters
  timestamp: number
}

export interface UseGPSOptions {
  /** Request high-accuracy reading (GPS vs cell/Wi-Fi). Default: `true`. */
  enableHighAccuracy?: boolean
  /** Maximum wait time in ms before timing out. Default: `10_000`. */
  timeout?: number
  /** Accept a cached position no older than this (ms). Default: `0`. */
  maximumAge?: number
}

export type PermissionState = 'prompt' | 'granted' | 'denied' | 'unavailable'

export interface UseGPSReturn {
  /** Latest position reading, or `null` if none yet. */
  position: GPSPosition | null
  /** Human-readable error string, or `null`. */
  error: string | null
  /** `true` while a one-shot or permission check is in flight. */
  isLoading: boolean
  /** Current permission state for the Geolocation API. */
  permissionState: PermissionState
  /** Request a single position fix. Resolves with the reading. */
  requestPosition: () => Promise<GPSPosition>
  /** Start continuous position tracking. */
  watchPosition: () => void
  /** Stop continuous position tracking. */
  stopWatching: () => void
  /** Re-query the permission state (useful after settings change). */
  checkPermission: () => Promise<void>
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isGeolocationAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'geolocation' in navigator
}

/**
 * Maps a `GeolocationPositionError.code` to a human-readable message.
 */
function toErrorMessage(err: GeolocationPositionError): string {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return 'Location permission was denied. Please enable location access in your browser settings.'
    case err.POSITION_UNAVAILABLE:
      return 'Location information is currently unavailable. Please try again.'
    case err.TIMEOUT:
      return 'Location request timed out. Please try again or move to an area with better signal.'
    default:
      return `An unknown location error occurred (code ${String(err.code)}).`
  }
}

function toGPSPosition(pos: GeolocationPosition): GPSPosition {
  return {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    accuracy: pos.coords.accuracy,
    timestamp: pos.timestamp,
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Hook for accessing the browser Geolocation API.
 *
 * Provides both a one-shot `requestPosition` (returns a Promise for use in
 * check-in/check-out flows) and a continuous `watchPosition` / `stopWatching`
 * pair. Automatically cleans up watchers on unmount.
 *
 * @example One-shot usage during check-in
 * ```ts
 * const { requestPosition } = useGPS()
 * const pos = await requestPosition()
 * startVisit(assignmentId, { lat: pos.latitude, lng: pos.longitude, accuracy: pos.accuracy })
 * ```
 *
 * @example Continuous tracking
 * ```ts
 * const { position, watchPosition, stopWatching } = useGPS()
 * useEffect(() => { watchPosition(); return stopWatching }, [])
 * ```
 */
export function useGPS(options: UseGPSOptions = {}): UseGPSReturn {
  const {
    enableHighAccuracy = true,
    timeout = 10_000,
    maximumAge = 0,
  } = options

  const [position, setPosition] = useState<GPSPosition | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [permissionState, setPermissionState] = useState<PermissionState>(
    isGeolocationAvailable() ? 'prompt' : 'unavailable',
  )

  // Ref to the active watch id so we can clear it deterministically.
  const watchIdRef = useRef<number | null>(null)
  // Track mount state to avoid setting state on unmounted component.
  const mountedRef = useRef(true)

  // Common options object for the Geolocation API.
  const positionOptions: PositionOptions = {
    enableHighAccuracy,
    timeout,
    maximumAge,
  }

  // ------------------------------------------------------------------
  // Permission management
  // ------------------------------------------------------------------

  const checkPermission = useCallback(async (): Promise<void> => {
    if (!isGeolocationAvailable()) {
      setPermissionState('unavailable')
      return
    }

    // `navigator.permissions` is not available in all browsers (notably iOS Safari < 16).
    if (typeof navigator.permissions?.query !== 'function') {
      // We cannot determine the state upfront; it will become clear when
      // the user is prompted via `getCurrentPosition` / `watchPosition`.
      return
    }

    try {
      const status = await navigator.permissions.query({ name: 'geolocation' })
      if (mountedRef.current) {
        setPermissionState(status.state as PermissionState)
      }

      // Listen for runtime changes (e.g. user revokes in browser settings).
      const handleChange = () => {
        if (mountedRef.current) {
          setPermissionState(status.state as PermissionState)
        }
      }
      status.addEventListener('change', handleChange)

      // We don't clean this up explicitly because the PermissionStatus
      // lifetime is scoped to the query; it will be GC'd together with
      // the handler once no references remain.
    } catch {
      // Some browsers throw for unsupported permission names. Swallow.
    }
  }, [])

  // Check permission on mount.
  useEffect(() => {
    void checkPermission()
  }, [checkPermission])

  // ------------------------------------------------------------------
  // One-shot position request (Promise-based for check-in flows)
  // ------------------------------------------------------------------

  const requestPosition = useCallback((): Promise<GPSPosition> => {
    return new Promise<GPSPosition>((resolve, reject) => {
      if (!isGeolocationAvailable()) {
        const msg = 'Geolocation is not supported by this browser.'
        if (mountedRef.current) {
          setError(msg)
          setPermissionState('unavailable')
        }
        reject(new Error(msg))
        return
      }

      if (mountedRef.current) {
        setIsLoading(true)
        setError(null)
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const gps = toGPSPosition(pos)
          if (mountedRef.current) {
            setPosition(gps)
            setError(null)
            setIsLoading(false)
            setPermissionState('granted')
          }
          resolve(gps)
        },
        (err) => {
          const msg = toErrorMessage(err)
          if (mountedRef.current) {
            setError(msg)
            setIsLoading(false)
            if (err.code === err.PERMISSION_DENIED) {
              setPermissionState('denied')
            }
          }
          reject(new Error(msg))
        },
        positionOptions,
      )
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableHighAccuracy, timeout, maximumAge])

  // ------------------------------------------------------------------
  // Continuous watch
  // ------------------------------------------------------------------

  const watchPosition = useCallback((): void => {
    if (!isGeolocationAvailable()) {
      setError('Geolocation is not supported by this browser.')
      setPermissionState('unavailable')
      return
    }

    // Avoid duplicate watchers.
    if (watchIdRef.current !== null) return

    setError(null)

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const gps = toGPSPosition(pos)
        if (mountedRef.current) {
          setPosition(gps)
          setError(null)
          setPermissionState('granted')
        }
      },
      (err) => {
        const msg = toErrorMessage(err)
        if (mountedRef.current) {
          setError(msg)
          if (err.code === err.PERMISSION_DENIED) {
            setPermissionState('denied')
          }
        }
      },
      positionOptions,
    )

    watchIdRef.current = id
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableHighAccuracy, timeout, maximumAge])

  const stopWatching = useCallback((): void => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }, [])

  // ------------------------------------------------------------------
  // Cleanup on unmount
  // ------------------------------------------------------------------

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
    }
  }, [])

  return {
    position,
    error,
    isLoading,
    permissionState,
    requestPosition,
    watchPosition,
    stopWatching,
    checkPermission,
  }
}
