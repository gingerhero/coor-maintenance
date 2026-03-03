import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { NS3451CodePicker } from '@/components/ns3451'
import { instructionEditorSchema, type InstructionEditorInput } from '@/lib/schemas'
import {
  useCreateInstruction,
  useUpdateInstruction,
  useDeactivateInstruction,
} from '@/features/manager/hooks/useInstructionEditor'
import type { InstructionWithNS3451 } from '@/features/assignments/hooks/useInstructions'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InstructionFormProps {
  propertyId: string
  instruction?: InstructionWithNS3451
  onSuccess: () => void
  onCancel: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InstructionForm({
  propertyId,
  instruction,
  onSuccess,
  onCancel,
}: InstructionFormProps) {
  const { t } = useTranslation('manager')
  const isEditMode = !!instruction

  const createMutation = useCreateInstruction()
  const updateMutation = useUpdateInstruction()
  const deactivateMutation = useDeactivateInstruction()

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<InstructionEditorInput>({
    resolver: zodResolver(instructionEditorSchema),
    defaultValues: isEditMode
      ? {
          ns3451_code: instruction.ns3451_code,
          activity_description: instruction.description,
          frequency_type: instruction.frequency_type,
          frequency_value: instruction.frequency_interval,
          season: instruction.season,
          property_id: propertyId,
          photo_required: instruction.photo_required,
          notify_board: instruction.notify_board,
          comment: instruction.comment ?? '',
        }
      : {
          ns3451_code: '',
          activity_description: '',
          frequency_type: 'every_visit',
          frequency_value: undefined,
          season: 'none',
          property_id: propertyId,
          photo_required: false,
          notify_board: false,
          comment: '',
        },
  })

  const frequencyType = watch('frequency_type')

  const onSubmit = async (data: InstructionEditorInput) => {
    // Map schema field names to DB column names
    const mapped = {
      ns3451_code: data.ns3451_code,
      description: data.activity_description,
      frequency_type: data.frequency_type,
      frequency_interval: data.frequency_value ?? 1,
      season: data.season ?? 'none',
      photo_required: data.photo_required,
      notify_board: data.notify_board,
      comment: data.comment || undefined,
    }

    if (isEditMode) {
      await updateMutation.mutateAsync({
        id: instruction.id,
        property_id: propertyId,
        ...mapped,
      })
    } else {
      await createMutation.mutateAsync({
        property_id: propertyId,
        ...mapped,
        frequency_interval: mapped.frequency_interval,
      })
    }
    onSuccess()
  }

  const handleDeactivate = async () => {
    if (!instruction) return
    if (!window.confirm(t('instructions.deactivateConfirm'))) return

    await deactivateMutation.mutateAsync({
      id: instruction.id,
      property_id: propertyId,
    })
    onSuccess()
  }

  const isMutating =
    isSubmitting ||
    createMutation.isPending ||
    updateMutation.isPending ||
    deactivateMutation.isPending

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* NS3451 Code */}
      <div className="space-y-1.5">
        <Label>{t('instructions.ns3451Code')}</Label>
        <Controller
          control={control}
          name="ns3451_code"
          render={({ field }) => (
            <NS3451CodePicker
              value={field.value}
              onChange={(code) => setValue('ns3451_code', code)}
              error={!!errors.ns3451_code}
            />
          )}
        />
        {errors.ns3451_code && (
          <p className="text-xs text-destructive">{errors.ns3451_code.message}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label>{t('instructions.description')}</Label>
        <Textarea
          {...register('activity_description')}
          error={!!errors.activity_description}
          placeholder={t('instructions.description')}
        />
        {errors.activity_description && (
          <p className="text-xs text-destructive">{errors.activity_description.message}</p>
        )}
      </div>

      {/* Frequency type */}
      <div className="space-y-1.5">
        <Label>{t('instructions.frequency')}</Label>
        <Controller
          control={control}
          name="frequency_type"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="every_visit">
                  {t('instructions.frequencyTypes.every_visit')}
                </SelectItem>
                <SelectItem value="weekly">
                  {t('instructions.frequencyTypes.weekly')}
                </SelectItem>
                <SelectItem value="monthly">
                  {t('instructions.frequencyTypes.monthly')}
                </SelectItem>
                <SelectItem value="quarterly">
                  {t('instructions.frequencyTypes.quarterly')}
                </SelectItem>
                <SelectItem value="yearly">
                  {t('instructions.frequencyTypes.yearly')}
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* Frequency interval (only when not every_visit) */}
      {frequencyType !== 'every_visit' && (
        <div className="space-y-1.5">
          <Label>{t('instructions.interval')}</Label>
          <Input
            type="number"
            min={1}
            {...register('frequency_value', { valueAsNumber: true })}
            error={!!errors.frequency_value}
          />
          {errors.frequency_value && (
            <p className="text-xs text-destructive">{errors.frequency_value.message}</p>
          )}
        </div>
      )}

      {/* Season */}
      <div className="space-y-1.5">
        <Label>{t('instructions.season')}</Label>
        <Controller
          control={control}
          name="season"
          render={({ field }) => (
            <Select value={field.value ?? 'none'} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  {t('instructions.seasons.none')}
                </SelectItem>
                <SelectItem value="summer">
                  {t('instructions.seasons.summer')}
                </SelectItem>
                <SelectItem value="winter">
                  {t('instructions.seasons.winter')}
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* Photo required */}
      <div className="flex items-center justify-between">
        <Label htmlFor="photo_required">{t('instructions.photoRequired')}</Label>
        <Controller
          control={control}
          name="photo_required"
          render={({ field }) => (
            <Switch
              id="photo_required"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </div>

      {/* Notify board */}
      <div className="flex items-center justify-between">
        <Label htmlFor="notify_board">{t('instructions.notifyBoard')}</Label>
        <Controller
          control={control}
          name="notify_board"
          render={({ field }) => (
            <Switch
              id="notify_board"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </div>

      {/* Comment */}
      <div className="space-y-1.5">
        <Label>{t('instructions.comment')}</Label>
        <Textarea
          {...register('comment')}
          error={!!errors.comment}
          placeholder={t('instructions.comment')}
        />
        {errors.comment && (
          <p className="text-xs text-destructive">{errors.comment.message}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-2 pt-2">
        <div>
          {isEditMode && instruction.is_active && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isMutating}
              onClick={handleDeactivate}
            >
              {t('instructions.deactivate')}
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
            {t('instructions.cancel')}
          </Button>
          <Button type="submit" disabled={isMutating}>
            {t('instructions.save')}
          </Button>
        </div>
      </div>
    </form>
  )
}
