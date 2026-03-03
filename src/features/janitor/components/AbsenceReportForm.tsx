import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { absenceReportSchema, type AbsenceReportInput } from '@/lib/schemas'
import { useCreateAbsenceReport } from '@/features/janitor/hooks/useAbsenceReport'
import { Controller } from 'react-hook-form'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AbsenceReportFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AbsenceReportForm({ open, onOpenChange }: AbsenceReportFormProps) {
  const { t } = useTranslation('janitor')
  const profile = useAuthStore((s) => s.profile)

  const createMutation = useCreateAbsenceReport()

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AbsenceReportInput>({
    resolver: zodResolver(absenceReportSchema),
    defaultValues: {
      absence_type: 'sick',
      reason: '',
      date_from: '',
      date_to: '',
    },
  })

  const onSubmit = async (data: AbsenceReportInput) => {
    if (!profile) return

    await createMutation.mutateAsync({
      from_janitor_id: profile.id,
      absence_type: data.absence_type,
      reason: data.reason,
      date_from: data.date_from,
      date_to: data.date_to,
    })

    reset()
    onOpenChange(false)
  }

  const isMutating = isSubmitting || createMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('absence.title')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Absence type */}
          <div className="space-y-1.5">
            <Label>{t('absence.type')}</Label>
            <Controller
              control={control}
              name="absence_type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sick">{t('absence.sick')}</SelectItem>
                    <SelectItem value="other">{t('absence.other')}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label>{t('absence.reason')}</Label>
            <Textarea
              {...register('reason')}
              error={!!errors.reason}
              placeholder={t('absence.reasonPlaceholder')}
            />
            {errors.reason && (
              <p className="text-xs text-destructive">{errors.reason.message}</p>
            )}
          </div>

          {/* Date from */}
          <div className="space-y-1.5">
            <Label>{t('absence.dateFrom')}</Label>
            <Input
              type="date"
              {...register('date_from')}
              error={!!errors.date_from}
            />
            {errors.date_from && (
              <p className="text-xs text-destructive">{errors.date_from.message}</p>
            )}
          </div>

          {/* Date to */}
          <div className="space-y-1.5">
            <Label>{t('absence.dateTo')}</Label>
            <Input
              type="date"
              {...register('date_to')}
              error={!!errors.date_to}
            />
            {errors.date_to && (
              <p className="text-xs text-destructive">{errors.date_to.message}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isMutating}
            >
              {t('absence.cancel')}
            </Button>
            <Button type="submit" disabled={isMutating}>
              {t('absence.submit')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
