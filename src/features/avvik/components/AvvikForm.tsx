import { useState, useCallback } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Camera, X, AlertTriangle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { avvikCreateSchema, type AvvikCreateInput } from '@/lib/schemas'
import { uploadPhoto } from '@/lib/storage'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useCamera, type CapturedPhoto } from '@/hooks/useCamera'
import { useGPS } from '@/hooks/useGPS'
import { useCreateAvvik } from '@/features/avvik/hooks/useAvvik'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { NS3451CodePicker } from '@/components/ns3451/NS3451CodePicker'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AvvikFormProps {
  propertyId: string
  assignmentId?: string
  prefilledNS3451Code?: string
  onSuccess: () => void
  onCancel: () => void
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_PHOTOS = 5

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AvvikForm({
  propertyId,
  assignmentId,
  prefilledNS3451Code,
  onSuccess,
  onCancel,
}: AvvikFormProps) {
  const { t } = useTranslation('janitor')
  const userId = useAuthStore((s) => s.profile?.id)

  // Photos state
  const [photos, setPhotos] = useState<CapturedPhoto[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Hooks
  const { capturePhoto, isCapturing } = useCamera()
  const { requestPosition } = useGPS({ enableHighAccuracy: true, timeout: 5_000 })
  const createAvvik = useCreateAvvik()

  // Form
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<AvvikCreateInput>({
    resolver: zodResolver(avvikCreateSchema),
    defaultValues: {
      title: '',
      description: '',
      severity: 'medium',
      ns3451_code: prefilledNS3451Code ?? undefined,
      location: '',
    },
  })

  const severity = watch('severity')

  // ------------------------------------------------------------------
  // Photo handling
  // ------------------------------------------------------------------

  const handleCapturePhoto = useCallback(async () => {
    if (photos.length >= MAX_PHOTOS) return

    const photo = await capturePhoto()
    if (photo) {
      setPhotos((prev) => [...prev, photo])
    }
  }, [capturePhoto, photos.length])

  const handleRemovePhoto = useCallback((index: number) => {
    setPhotos((prev) => {
      const removed = prev[index]
      if (removed) {
        URL.revokeObjectURL(removed.previewUrl)
      }
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  // ------------------------------------------------------------------
  // Submit
  // ------------------------------------------------------------------

  const onSubmit = useCallback(
    async (data: AvvikCreateInput) => {
      if (!userId) return

      setIsSubmitting(true)

      try {
        // 1. Get GPS position
        let gpsLat: number | undefined
        let gpsLng: number | undefined
        let gpsAccuracy: number | undefined

        try {
          const pos = await requestPosition()
          gpsLat = pos.latitude
          gpsLng = pos.longitude
          gpsAccuracy = pos.accuracy
        } catch {
          // GPS unavailable; proceed without
        }

        // 2. Create the avvik record
        const avvik = await createAvvik.mutateAsync({
          property_id: propertyId,
          assignment_id: assignmentId,
          title: data.title,
          description: data.description,
          severity: data.severity,
          ns3451_code: data.ns3451_code,
          location: data.location,
          gps_lat: gpsLat,
          gps_lng: gpsLng,
          gps_accuracy: gpsAccuracy,
        })

        // 3. Upload photos and insert photo records
        if (photos.length > 0 && avvik) {
          const uploadPromises = photos.map(async (photo) => {
            const { path } = await uploadPhoto(
              photo.file,
              propertyId,
              'avvik',
              avvik.id,
            )

            // Insert photo record in database
            await supabase.from('photos').insert({
              storage_path: path,
              entity_type: 'avvik' as const,
              entity_id: avvik.id,
              gps_lat: photo.gpsCoords?.latitude ?? null,
              gps_lng: photo.gpsCoords?.longitude ?? null,
              uploaded_by: userId,
            })
          })

          await Promise.all(uploadPromises)
        }

        // 4. Success
        toast.success(t('avvik.submitted'))
        onSuccess()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        toast.error(message)
      } finally {
        setIsSubmitting(false)
      }
    },
    [
      userId,
      propertyId,
      assignmentId,
      photos,
      requestPosition,
      createAvvik,
      onSuccess,
      t,
    ],
  )

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-5 pb-6"
    >
      {/* Title */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="avvik-title" className="text-sm font-medium">
          {t('avvik.titleField')} *
        </label>
        <Input
          id="avvik-title"
          placeholder={t('avvik.titlePlaceholder')}
          error={!!errors.title}
          {...register('title')}
        />
        {errors.title && (
          <p className="text-xs text-destructive">{errors.title.message}</p>
        )}
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="avvik-description" className="text-sm font-medium">
          {t('avvik.description')} *
        </label>
        <Textarea
          id="avvik-description"
          placeholder={t('avvik.descriptionPlaceholder')}
          rows={4}
          error={!!errors.description}
          {...register('description')}
        />
        {errors.description && (
          <p className="text-xs text-destructive">
            {errors.description.message}
          </p>
        )}
      </div>

      {/* Severity */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">{t('avvik.severity')} *</label>
        <Controller
          name="severity"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">
                  <span className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-coor-green-500" />
                    {t('avvik.severityLow')}
                  </span>
                </SelectItem>
                <SelectItem value="medium">
                  <span className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-coor-orange-500" />
                    {t('avvik.severityMedium')}
                  </span>
                </SelectItem>
                <SelectItem value="high">
                  <span className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-destructive" />
                    {t('avvik.severityHigh')}
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        {errors.severity && (
          <p className="text-xs text-destructive">{errors.severity.message}</p>
        )}
      </div>

      {/* NS 3451 Code */}
      <Controller
        name="ns3451_code"
        control={control}
        render={({ field }) => (
          <NS3451CodePicker
            value={field.value}
            onChange={field.onChange}
            label={t('avvik.ns3451Code')}
          />
        )}
      />

      {/* Location */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="avvik-location" className="text-sm font-medium">
          {t('avvik.location')}
        </label>
        <Input
          id="avvik-location"
          placeholder={t('avvik.locationPlaceholder')}
          {...register('location')}
        />
      </div>

      {/* Photo capture */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">{t('avvik.photo')}</label>

        {/* Photo grid */}
        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo, idx) => (
              <div key={photo.capturedAt} className="relative aspect-square">
                <img
                  src={photo.previewUrl}
                  alt={`Photo ${idx + 1}`}
                  className="h-full w-full rounded-md object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(idx)}
                  className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-white shadow-sm"
                  aria-label={`Remove photo ${idx + 1}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Capture button */}
        {photos.length < MAX_PHOTOS && (
          <Button
            type="button"
            variant="outline"
            onClick={handleCapturePhoto}
            disabled={isCapturing}
            className="w-full"
          >
            {isCapturing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
            {t('avvik.photo')}
          </Button>
        )}

        {/* Photo count / max info */}
        {photos.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {t('avvik.photoCount', { count: photos.length })} &middot;{' '}
            {t('avvik.photoMax')}
          </p>
        )}

        {/* High severity photo warning */}
        {severity === 'high' && photos.length === 0 && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
            <p className="text-xs font-medium text-destructive">
              {t('avvik.photoMandatory')}
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 pt-2">
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {t('avvik.submit')}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          {t('avvik.cancel')}
        </Button>
      </div>
    </form>
  )
}
