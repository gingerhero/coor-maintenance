import { supabase } from './supabase'

const PHOTOS_BUCKET = 'photos'

/**
 * Upload a photo to Supabase Storage
 * Path format: {property_id}/{entity_type}/{entity_id}/{filename}
 */
export async function uploadPhoto(
  file: File,
  propertyId: string,
  entityType: 'task' | 'avvik' | 'checkin',
  entityId: string,
): Promise<{ path: string; url: string }> {
  const ext = file.name.split('.').pop() || 'jpg'
  const filename = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`
  const path = `${propertyId}/${entityType}/${entityId}/${filename}`

  const { error } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) throw new Error(`Upload failed: ${error.message}`)

  // For private buckets, use createSignedUrl instead
  const { data: signedData, error: signedError } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .createSignedUrl(path, 3600) // 1 hour

  if (signedError) throw new Error(`Signed URL failed: ${signedError.message}`)

  return { path, url: signedData.signedUrl }
}

/**
 * Get a signed URL for viewing a photo
 */
export async function getPhotoUrl(path: string, expiresIn = 3600): Promise<string> {
  const { data, error } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .createSignedUrl(path, expiresIn)

  if (error) throw new Error(`URL generation failed: ${error.message}`)
  return data.signedUrl
}

/**
 * Delete a photo from storage
 */
export async function deletePhoto(path: string): Promise<void> {
  const { error } = await supabase.storage.from(PHOTOS_BUCKET).remove([path])
  if (error) throw new Error(`Delete failed: ${error.message}`)
}
