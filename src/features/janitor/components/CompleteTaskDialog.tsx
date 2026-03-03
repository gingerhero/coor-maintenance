import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Camera } from 'lucide-react'
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
  onConfirm: (noAvvikConfirmed: boolean) => void
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

  const [noAvvikChecked, setNoAvvikChecked] = useState(false)

  // If notifyBoard is on, the janitor must explicitly confirm no avvik.
  const canSubmit = (!notifyBoard || noAvvikChecked) && !isSubmitting

  function handleConfirm() {
    if (!canSubmit) return
    onConfirm(noAvvikChecked)
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      setNoAvvikChecked(false)
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

          {/* Photo-required notice */}
          {photoRequired && (
            <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
              <Camera className="h-4 w-4 shrink-0" />
              <span>{t('checklist.photoRequired')}</span>
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
            className="bg-coor-green-500 hover:bg-coor-green-600 active:bg-coor-green-700"
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
