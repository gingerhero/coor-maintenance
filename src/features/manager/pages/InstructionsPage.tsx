import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useProperties } from '@/features/properties/hooks/useProperties'
import {
  usePropertyInstructionsAll,
  usePublishInstruction,
} from '@/features/manager/hooks/useInstructionEditor'
import { InstructionList } from '@/features/manager/components/InstructionList'
import { InstructionForm } from '@/features/manager/components/InstructionForm'
import type { InstructionWithNS3451 } from '@/features/assignments/hooks/useInstructions'

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export function InstructionsPage() {
  const { t } = useTranslation('manager')

  // State
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null)
  const [selectedInstruction, setSelectedInstruction] = useState<InstructionWithNS3451 | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  // Data
  const { data: properties } = useProperties()
  const { data: instructions, isLoading } = usePropertyInstructionsAll(
    selectedPropertyId ?? undefined,
  )
  const publishMutation = usePublishInstruction()

  // Handlers
  const handlePublish = (instruction: InstructionWithNS3451) => {
    if (!selectedPropertyId) return
    if (!window.confirm(t('instructions.publishConfirm'))) return

    publishMutation.mutate({
      id: instruction.id,
      property_id: selectedPropertyId,
      currentVersion: instruction.version,
    })
  }

  const handleCloseDialog = () => {
    setShowCreateForm(false)
    setSelectedInstruction(null)
  }

  const isDialogOpen = showCreateForm || !!selectedInstruction

  return (
    <div className="space-y-6">
      {/* Page header */}
      <h1 className="text-2xl font-bold">{t('instructions.title')}</h1>

      {/* Property selector */}
      <Select
        value={selectedPropertyId ?? ''}
        onValueChange={(value) => setSelectedPropertyId(value || null)}
      >
        <SelectTrigger>
          <SelectValue placeholder={t('instructions.selectProperty')} />
        </SelectTrigger>
        <SelectContent>
          {properties?.map((property) => (
            <SelectItem key={property.id} value={property.id}>
              {property.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Content */}
      {!selectedPropertyId ? (
        <EmptyState
          title={t('instructions.noPropertySelected')}
        />
      ) : (
        <>
          {/* Actions row */}
          <div className="flex justify-end">
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              {t('instructions.addInstruction')}
            </Button>
          </div>

          {/* Instruction list */}
          <InstructionList
            instructions={instructions ?? []}
            onSelect={setSelectedInstruction}
            onPublish={handlePublish}
            isLoading={isLoading}
          />
        </>
      )}

      {/* Form dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedInstruction
                ? t('instructions.editInstruction')
                : t('instructions.addInstruction')}
            </DialogTitle>
            <DialogDescription>
              {selectedInstruction
                ? t('instructions.editInstruction')
                : t('instructions.newVersion')}
            </DialogDescription>
          </DialogHeader>

          {selectedPropertyId && (
            <InstructionForm
              propertyId={selectedPropertyId}
              instruction={selectedInstruction ?? undefined}
              onSuccess={handleCloseDialog}
              onCancel={handleCloseDialog}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
