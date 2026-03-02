import { useState, useRef, useCallback, useEffect } from 'react'
import { useGPS } from '@/hooks/useGPS'
import type { GPSPosition } from '@/hooks/useGPS'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CapturedPhoto {
  /** Compressed image file ready for upload. */
  file: File
  /** Object URL for in-memory preview. Revoke via `URL.revokeObjectURL` when done. */
  previewUrl: string
  /** Pixel width after compression. */
  width: number
  /** Pixel height after compression. */
  height: number
  /** GPS coordinates captured alongside the photo, if available. */
  gpsCoords?: { latitude: number; longitude: number }
  /** ISO-8601 timestamp of when the photo was taken/selected. */
  capturedAt: string
}

export interface UseCameraOptions {
  /** Maximum output width in pixels. Default: `1920`. */
  maxWidth?: number
  /** Maximum output height in pixels. Default: `1080`. */
  maxHeight?: number
  /** JPEG quality factor (0-1). Default: `0.8`. */
  quality?: number
  /** Attach current GPS coordinates to the captured photo. Default: `true`. */
  includeGPS?: boolean
}

export interface UseCameraReturn {
  /** Open the device camera and capture a photo. Returns `null` if cancelled. */
  capturePhoto: () => Promise<CapturedPhoto | null>
  /** Open the file picker to select an existing image. Returns `null` if cancelled. */
  selectPhoto: () => Promise<CapturedPhoto | null>
  /** `true` while a capture/selection + processing pipeline is running. */
  isCapturing: boolean
  /** Human-readable error string, or `null`. */
  error: string | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Creates a hidden `<input type="file">` element, triggers it, and resolves
 * with the selected `File` (or `null` if the user cancelled).
 */
function pickFile(accept: string, capture?: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    if (capture) {
      input.setAttribute('capture', capture)
    }
    // Ensure the element is in the DOM for iOS Safari compatibility.
    input.style.position = 'fixed'
    input.style.left = '-9999px'
    input.style.opacity = '0'
    document.body.appendChild(input)

    let resolved = false

    const cleanup = () => {
      input.remove()
    }

    input.addEventListener('change', () => {
      resolved = true
      const file = input.files?.[0] ?? null
      cleanup()
      resolve(file)
    })

    // Handle cancellation. There is no reliable `cancel` event on file inputs
    // across all browsers. We use a focus-return heuristic: when the window
    // regains focus after the picker is dismissed, we resolve with null if
    // no file was chosen.
    const handleFocus = () => {
      // Small delay: the 'change' event may fire just *after* focus returns.
      setTimeout(() => {
        window.removeEventListener('focus', handleFocus)
        if (!resolved) {
          resolved = true
          cleanup()
          resolve(null)
        }
      }, 500)
    }
    window.addEventListener('focus', handleFocus)

    input.click()
  })
}

/**
 * Loads an image `File` into an `HTMLImageElement`.
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url) // free the temporary URL
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image for processing.'))
    }
    img.src = url
  })
}

/**
 * Compresses / resizes an image using an off-screen canvas and returns the
 * resulting `Blob` together with the output dimensions.
 */
function compressImage(
  img: HTMLImageElement,
  maxWidth: number,
  maxHeight: number,
  quality: number,
): Promise<{ blob: Blob; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    let { width, height } = img

    // Scale down while preserving aspect ratio.
    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height)
      width = Math.round(width * ratio)
      height = Math.round(height * ratio)
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      reject(new Error('Canvas 2D context is not available.'))
      return
    }

    ctx.drawImage(img, 0, 0, width, height)

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Image compression produced no output.'))
          return
        }
        resolve({ blob, width, height })
      },
      'image/jpeg',
      quality,
    )
  })
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Hook for capturing or selecting photos, compressing them, and optionally
 * tagging with GPS coordinates.
 *
 * Uses standard browser APIs (`<input type="file">` and `<canvas>`) so it
 * works in any modern browser and PWA. Capacitor-native camera support can
 * be layered on later.
 *
 * @example Capture a photo with GPS
 * ```tsx
 * const { capturePhoto, isCapturing, error } = useCamera()
 *
 * const handleCapture = async () => {
 *   const photo = await capturePhoto()
 *   if (photo) {
 *     // photo.file is ready for upload
 *     // photo.previewUrl can be bound to an <img> src
 *   }
 * }
 * ```
 */
export function useCamera(options: UseCameraOptions = {}): UseCameraReturn {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.8,
    includeGPS = true,
  } = options

  const [isCapturing, setIsCapturing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Keep track of object URLs we create so we can revoke on unmount.
  const previewUrlsRef = useRef<Set<string>>(new Set())
  const mountedRef = useRef(true)

  const { requestPosition } = useGPS({ enableHighAccuracy: true, timeout: 5_000 })

  // ------------------------------------------------------------------
  // Shared processing pipeline
  // ------------------------------------------------------------------

  const processFile = useCallback(
    async (file: File): Promise<CapturedPhoto> => {
      const img = await loadImage(file)
      const { blob, width, height } = await compressImage(img, maxWidth, maxHeight, quality)

      // Build a proper File from the Blob so consumers get a filename / type.
      const timestamp = new Date().toISOString()
      const filename = `photo_${timestamp.replace(/[:.]/g, '-')}.jpg`
      const compressed = new File([blob], filename, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      })

      const previewUrl = URL.createObjectURL(compressed)
      previewUrlsRef.current.add(previewUrl)

      // Optionally attach GPS coordinates.
      let gpsCoords: CapturedPhoto['gpsCoords'] = undefined
      if (includeGPS) {
        try {
          const pos: GPSPosition = await requestPosition()
          gpsCoords = { latitude: pos.latitude, longitude: pos.longitude }
        } catch {
          // GPS unavailable or denied -- proceed without coordinates.
          // The caller can inspect `gpsCoords === undefined` to decide
          // whether to prompt the user.
        }
      }

      return {
        file: compressed,
        previewUrl,
        width,
        height,
        gpsCoords,
        capturedAt: timestamp,
      }
    },
    [maxWidth, maxHeight, quality, includeGPS, requestPosition],
  )

  // ------------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------------

  const capturePhoto = useCallback(async (): Promise<CapturedPhoto | null> => {
    if (isCapturing) return null

    setIsCapturing(true)
    setError(null)

    try {
      const file = await pickFile('image/*', 'environment')
      if (!file) {
        // User cancelled.
        return null
      }

      const photo = await processFile(file)
      return photo
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to capture photo.'
      if (mountedRef.current) setError(msg)
      return null
    } finally {
      if (mountedRef.current) setIsCapturing(false)
    }
  }, [isCapturing, processFile])

  const selectPhoto = useCallback(async (): Promise<CapturedPhoto | null> => {
    if (isCapturing) return null

    setIsCapturing(true)
    setError(null)

    try {
      const file = await pickFile('image/*')
      if (!file) {
        return null
      }

      const photo = await processFile(file)
      return photo
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to select photo.'
      if (mountedRef.current) setError(msg)
      return null
    } finally {
      if (mountedRef.current) setIsCapturing(false)
    }
  }, [isCapturing, processFile])

  // ------------------------------------------------------------------
  // Cleanup preview URLs on unmount to prevent memory leaks
  // ------------------------------------------------------------------

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      for (const url of previewUrlsRef.current) {
        URL.revokeObjectURL(url)
      }
      previewUrlsRef.current.clear()
    }
  }, [])

  return {
    capturePhoto,
    selectPhoto,
    isCapturing,
    error,
  }
}
