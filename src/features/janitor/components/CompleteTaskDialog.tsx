import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Camera, X, ImagePlus, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCamera, type CapturedPhoto } from '@/hooks/useCamera'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CompleteTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (noAvvikConfirmed: boolean, photos: CapturedPhoto[]) => void
  taskDescription: string
  photoRequired: boolean
  notifyBoard: boolean
  isSubmitting: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Confirmation dialog shown when a janitor taps "Utfr" on a task.
 *
 * When `notifyBoard` is true the janitor must confirm that no discrepancy
 * (avvik) was observed before they can mark the task as done.
 */
export function CompleteTaskDialog({
  open,
  onOpenChange,
  onConfirm,
  taskDescription,
  photoRequired,
  notifyBoard,
  isSubmitting,
}: CompleteTaskDialogProps) {
  const { t } = useTranslation('janitor')
  const { t: tc } = useTranslation('common')

  const MAX_PHOTOS = 3

  const [noAvvikChecked, setNoAvvikChecked] = useState(false)
  const [photos, setPhotos] = useState<CapturedPhoto[]>([])
  const { capturePhoto, selectPhoto, isCapturing } = useCamera()

  const hasRequiredPhotos = !photoRequired || photos.length > 0
  const canSubmit =
    (!notifyBoard || noAvvikChecked) && hasRequiredPhotos && !isSubmitting && !isCapturing

  const handleCapturePhoto = useCallback(async () => {
    if (photos.length >= MAX_PHOTOS) return
    const photo = await capturePhoto()
    if (photo) {
      setPhotos((prev) => [...prev, photo])
    }
  }, [capturePhoto, photos.length])

  const handleSelectPhoto = useCallback(async () => {
    if (photos.length >= MAX_PHOTOS) return
    const photo = await selectPhoto()
    if (photo) {
      setPhotos((prev) => [...prev, photo])
    }
  }, [selectPhoto, photos.length])

  const handleRemovePhoto = useCallback((index: number) => {
    setPhotos((prev) => {
      const removed = prev[index]
      if (removed) URL.revokeObjectURL(removed.previewUrl)
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  function handleConfirm() {
    if (!canSubmit) return
    onConfirm(noAvvikChecked, photos)
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      setNoAvvikChecked(false)
      for (const photo of photos) {
        URL.revokeObjectURL(photo.previewUrl)
      }
      setPhotos([])
    }
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('checklist.done')}</DialogTitle>
          <DialogDescription className="line-clamp-2">
            {taskDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Notify-board checkbox */}
          {notifyBoard && (
            <div className="flex items-start gap-3 rounded-md border border-border p-3">
              <Checkbox
                id="no-avvik"
                checked={noAvvikChecked}
                onCheckedChange={(checked) =>
                  setNoAvvikChecked(checked === true)
                }
                className="mt-0.5"
              />
              <div className="space-y-1">
                <label
                  htmlFor="no-avvik"
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  {t('checklist.noAvvikConfirmed')}
                </label>
                <p className="text-xs text-muted-foreground">
                  {t('checklist.avvikFound')}
                </p>
              </div>
            </div>
          )}

          {/* Photo capture section */}
          {photoRequired && (
            <div className="space-y-3">
              <div
                className={cn(
                  'flex items-center gap-2 rounded-md border p-3 text-sm',
                  photos.length === 0
                    ? 'border-amber-300 bg-amber-50 text-amber-800'
                    : 'border-emerald-300 bg-emerald-50 text-emerald-800',
                )}
              >
                <Camera className="h-4 w-4 shrink-0" />
                <span>
                  {photos.length === 0
                    ? t('checklist.photoRequired')
                    : t('checklist.photoAdded', { count: photos.length })}
                </span>
              </div>

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

              {photos.length < MAX_PHOTOS && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={handleCapturePhoto}
                    disabled={isCapturing || isSubmitting}
                  >
                    {isCapturing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                    {t('checklist.takePhoto')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={handleSelectPhoto}
                    disabled={isCapturing || isSubmitting}
                  >
                    <ImagePlus className="h-4 w-4" />
                    {t('checklist.selectPhoto')}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            size="lg"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            {tc('cancel')}
          </Button>
          <Button
            size="lg"
            className="bg-accent-emerald-500 hover:bg-accent-emerald-600 active:bg-accent-emerald-700"
            onClick={handleConfirm}
            disabled={!canSubmit}
          >
            {isSubmitting ? (
              <>
                <Spinner size="sm" className="text-white" />
                {tc('confirm')}
              </>
            ) : (
              tc('confirm')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
