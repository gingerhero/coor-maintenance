import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SkipReason } from '@/types/database'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SkipTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (reason: SkipReason, note?: string) => void
  taskDescription: string
  isSubmitting: boolean
}

// ---------------------------------------------------------------------------
// Skip reason options
// ---------------------------------------------------------------------------

const SKIP_REASONS: { value: SkipReason; labelKey: string }[] = [
  { value: 'not_accessible', labelKey: 'skip.notAccessible' },
  { value: 'not_necessary', labelKey: 'skip.notNecessary' },
  { value: 'lacked_materials', labelKey: 'skip.lackedMaterials' },
  { value: 'other', labelKey: 'skip.other' },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Dialog shown when a janitor taps "Hopp over" on a task.
 * Collects a skip reason (required) and an optional note (required if "other").
 */
export function SkipTaskDialog({
  open,
  onOpenChange,
  onConfirm,
  taskDescription,
  isSubmitting,
}: SkipTaskDialogProps) {
  const { t } = useTranslation('janitor')
  const { t: tc } = useTranslation('common')

  const [reason, setReason] = useState<SkipReason | ''>('')
  const [note, setNote] = useState('')

  const isOther = reason === 'other'
  const canSubmit =
    reason !== '' && (!isOther || note.trim().length > 0) && !isSubmitting

  function handleConfirm() {
    if (!canSubmit || reason === '') return
    onConfirm(reason, note.trim() || undefined)
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      // Reset form state when closing
      setReason('')
      setNote('')
    }
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('skip.title')}</DialogTitle>
          <DialogDescription className="line-clamp-2">
            {taskDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Reason selector */}
          <div className="space-y-1.5">
            <label
              htmlFor="skip-reason"
              className="block text-sm font-medium"
            >
              {t('skip.reason')}
            </label>
            <Select
              value={reason}
              onValueChange={(val) => setReason(val as SkipReason)}
            >
              <SelectTrigger id="skip-reason">
                <SelectValue placeholder={t('skip.reason')} />
              </SelectTrigger>
              <SelectContent>
                {SKIP_REASONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {t(opt.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Optional note (required for "other") */}
          <div className="space-y-1.5">
            <label
              htmlFor="skip-note"
              className="block text-sm font-medium"
            >
              {t('skip.note')}
              {isOther && <span className="text-destructive"> *</span>}
            </label>
            <Textarea
              id="skip-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('skip.notePlaceholder')}
              error={isOther && note.trim().length === 0}
            />
          </div>
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
