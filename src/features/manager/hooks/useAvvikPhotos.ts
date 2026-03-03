import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery'
import { getPhotoUrl } from '@/lib/storage'
import type { Photo } from '@/types/database'

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

const avvikPhotoKeys = {
  all: ['avvik-photos'] as const,
  forAvvik: (avvikId: string) => ['avvik-photos', avvikId] as const,
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PhotoWithUrl {
  id: string
  url: string
  storage_path: string
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Fetches photo records for a specific avvik from the photos table.
 */
export function useAvvikPhotos(avvikId: string | undefined) {
  return useSupabaseQuery(
    avvikPhotoKeys.forAvvik(avvikId ?? ''),
    () =>
      supabase
        .from('photos')
        .select('*')
        .eq('entity_type', 'avvik')
        .eq('entity_id', avvikId!)
        .returns<Photo[]>(),
    { enabled: !!avvikId },
  )
}

/**
 * Fetches photos for an avvik and resolves signed URLs for each.
 * Returns an array of { id, url, storage_path } objects.
 */
export function useAvvikPhotoUrls(avvikId: string | undefined) {
  const { data: photos, isLoading: photosLoading } = useAvvikPhotos(avvikId)
  const [resolvedPhotos, setResolvedPhotos] = useState<PhotoWithUrl[]>([])
  const [isResolvingUrls, setIsResolvingUrls] = useState(false)

  useEffect(() => {
    if (!photos || photos.length === 0) {
      setResolvedPhotos([])
      return
    }

    let cancelled = false
    setIsResolvingUrls(true)

    async function resolveUrls() {
      const results: PhotoWithUrl[] = []

      for (const photo of photos!) {
        try {
          const url = await getPhotoUrl(photo.storage_path)
          results.push({
            id: photo.id,
            url,
            storage_path: photo.storage_path,
          })
        } catch {
          // Skip photos that fail to resolve
        }
      }

      if (!cancelled) {
        setResolvedPhotos(results)
        setIsResolvingUrls(false)
      }
    }

    void resolveUrls()

    return () => {
      cancelled = true
    }
  }, [photos])

  return {
    photos: resolvedPhotos,
    isLoading: photosLoading || isResolvingUrls,
  }
}
