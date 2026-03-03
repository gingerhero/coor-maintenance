import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { rosterEntrySchema, type RosterEntryInput } from '@/lib/schemas'
import {
  useCreateRosterEntry,
  useUpdateRosterEntry,
  useDeactivateRosterEntry,
  type RosterEntryWithJanitor,
} from '@/features/manager/hooks/useRoster'
import type { Profile } from '@/types/database'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAYS = [
  { key: 'mon', label: 'Ma' },
  { key: 'tue', label: 'Ti' },
  { key: 'wed', label: 'On' },
  { key: 'thu', label: 'To' },
  { key: 'fri', label: 'Fr' },
  { key: 'sat', label: 'Lø' },
  { key: 'sun', label: 'Sø' },
] as const

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RosterEntryFormProps {
  propertyId: string
  janitors: Pick<Profile, 'id' | 'full_name' | 'email'>[]
  entry?: RosterEntryWithJanitor
  onSuccess: () => void
  onCancel: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RosterEntryForm({
  propertyId,
  janitors,
  entry,
  onSuccess,
  onCancel,
}: RosterEntryFormProps) {
  const { t } = useTranslation('manager')
  const isEditMode = !!entry

  const createMutation = useCreateRosterEntry()
  const updateMutation = useUpdateRosterEntry()
  const deactivateMutation = useDeactivateRosterEntry()

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RosterEntryInput>({
    resolver: zodResolver(rosterEntrySchema),
    defaultValues: isEditMode
      ? {
          janitor_id: entry.janitor_id,
          property_id: propertyId,
          budgeted_weekly_hours: entry.budgeted_weekly_hours ?? 0,
          schedule: {
            mon: entry.schedule?.mon ?? false,
            tue: entry.schedule?.tue ?? false,
            wed: entry.schedule?.wed ?? false,
            thu: entry.schedule?.thu ?? false,
            fri: entry.schedule?.fri ?? false,
            sat: entry.schedule?.sat ?? false,
            sun: entry.schedule?.sun ?? false,
          },
          active_from: entry.active_from,
          active_to: entry.active_to ?? undefined,
        }
      : {
          janitor_id: '',
          property_id: propertyId,
          budgeted_weekly_hours: 0,
          schedule: {
            mon: true,
            tue: true,
            wed: true,
            thu: true,
            fri: true,
            sat: false,
            sun: false,
          },
          active_from: format(new Date(), 'yyyy-MM-dd'),
          active_to: undefined,
        },
  })

  const onSubmit = async (data: RosterEntryInput) => {
    if (isEditMode) {
      await updateMutation.mutateAsync({
        id: entry.id,
        property_id: propertyId,
        budgeted_weekly_hours: data.budgeted_weekly_hours,
        schedule: data.schedule,
        active_from: data.active_from,
        active_to: data.active_to ?? undefined,
      })
    } else {
      await createMutation.mutateAsync({
        janitor_id: data.janitor_id,
        property_id: data.property_id,
        budgeted_weekly_hours: data.budgeted_weekly_hours,
        schedule: data.schedule,
        active_from: data.active_from,
        active_to: data.active_to ?? undefined,
      })
    }
    onSuccess()
  }

  const handleDeactivate = async () => {
    if (!entry) return
    if (!window.confirm(t('roster.entry.deactivateConfirm'))) return

    await deactivateMutation.mutateAsync({ id: entry.id })
    onSuccess()
  }

  const isMutating =
    isSubmitting ||
    createMutation.isPending ||
    updateMutation.isPending ||
    deactivateMutation.isPending

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Janitor selector */}
      <div className="space-y-1.5">
        <Label>{t('roster.entry.janitor')}</Label>
        <Controller
          control={control}
          name="janitor_id"
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={field.onChange}
              disabled={isEditMode}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('roster.entry.janitor')} />
              </SelectTrigger>
              <SelectContent>
                {janitors.map((j) => (
                  <SelectItem key={j.id} value={j.id}>
                    {j.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.janitor_id && (
          <p className="text-xs text-destructive">{errors.janitor_id.message}</p>
        )}
      </div>

      {/* Budgeted hours */}
      <div className="space-y-1.5">
        <Label>{t('roster.entry.budgetedHours')}</Label>
        <Input
          type="number"
          min={1}
          max={40}
          {...register('budgeted_weekly_hours', { valueAsNumber: true })}
          error={!!errors.budgeted_weekly_hours}
        />
        {errors.budgeted_weekly_hours && (
          <p className="text-xs text-destructive">
            {errors.budgeted_weekly_hours.message}
          </p>
        )}
      </div>

      {/* Active from */}
      <div className="space-y-1.5">
        <Label>{t('roster.entry.activeFrom')}</Label>
        <Input
          type="date"
          {...register('active_from')}
          error={!!errors.active_from}
        />
        {errors.active_from && (
          <p className="text-xs text-destructive">{errors.active_from.message}</p>
        )}
      </div>

      {/* Active to */}
      <div className="space-y-1.5">
        <Label>{t('roster.entry.activeTo')}</Label>
        <Input
          type="date"
          {...register('active_to')}
          error={!!errors.active_to}
          placeholder="Løpende"
        />
        {errors.active_to && (
          <p className="text-xs text-destructive">{errors.active_to.message}</p>
        )}
      </div>

      {/* Schedule checkboxes */}
      <div className="space-y-1.5">
        <Label>{t('roster.entry.schedule')}</Label>
        <div className="flex gap-3">
          {DAYS.map((day) => (
            <Controller
              key={day.key}
              control={control}
              name={`schedule.${day.key}`}
              render={({ field }) => (
                <div className="flex flex-col items-center gap-1">
                  <label
                    htmlFor={`schedule-${day.key}`}
                    className="text-xs font-medium text-muted-foreground"
                  >
                    {day.label}
                  </label>
                  <Checkbox
                    id={`schedule-${day.key}`}
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </div>
              )}
            />
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label>{t('roster.entry.notes')}</Label>
        <Textarea
          {...register('notes' as keyof RosterEntryInput)}
          placeholder={t('roster.entry.notes')}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-2 pt-2">
        <div>
          {isEditMode && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isMutating}
              onClick={handleDeactivate}
            >
              {t('roster.entry.deactivate')}
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isMutating}
          >
            {t('roster.entry.cancel')}
          </Button>
          <Button type="submit" disabled={isMutating}>
            {t('roster.entry.save')}
          </Button>
        </div>
      </div>
    </form>
  )
}
