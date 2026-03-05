import { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { uploadPhoto } from '@/lib/storage'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { CapturedPhoto } from '@/hooks/useCamera'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'
import { NS3451Badge } from '@/components/ns3451/NS3451Badge'
import { useAssignment } from '@/features/assignments/hooks/useAssignments'
import {
  useCompleteTask,
  useSkipTask,
} from '@/features/assignments/hooks/useTaskExecutions'
import { useChecklist } from '@/features/janitor/hooks/useChecklist'
import type { ChecklistItem } from '@/features/janitor/hooks/useChecklist'
import { useGPS } from '@/hooks/useGPS'
import type { SkipReason } from '@/types/database'

import { TaskCard } from '@/features/janitor/components/TaskCard'
import { CompleteTaskDialog } from '@/features/janitor/components/CompleteTaskDialog'
import { SkipTaskDialog } from '@/features/janitor/components/SkipTaskDialog'
import { AvvikForm } from '@/features/avvik/components/AvvikForm'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Finds a ChecklistItem by instruction ID across all groups.
 */
function findItem(
  groups: ReturnType<typeof useChecklist>['groups'],
  instructionId: string,
): ChecklistItem | undefined {
  for (const group of groups) {
    const found = group.items.find((i) => i.instruction.id === instructionId)
    if (found) return found
  }
  return undefined
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ChecklistPage() {
  const { t } = useTranslation('janitor')
  const { t: tc } = useTranslation('common')
  const { id: assignmentId } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // Fetch assignment to get the property_id
  const { data: assignment } = useAssignment(assignmentId)
  const propertyId = assignment?.property_id

  // Checklist data
  const {
    groups,
    totalTasks,
    completedTasks,
    isLoading,
    error,
  } = useChecklist(assignmentId, propertyId)

  // Mutations
  const completeTask = useCompleteTask()
  const skipTask = useSkipTask()

  // GPS for stamping executions
  const { requestPosition } = useGPS({ enableHighAccuracy: true, timeout: 5_000 })

  // Dialog state
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false)
  const [skipDialogOpen, setSkipDialogOpen] = useState(false)
  const [avvikDialogOpen, setAvvikDialogOpen] = useState(false)
  const [avvikPrefilledCode, setAvvikPrefilledCode] = useState<string | undefined>(undefined)
  const [activeInstructionId, setActiveInstructionId] = useState<string | null>(
    null,
  )

  // The ChecklistItem for the currently active dialog
  const activeItem = activeInstructionId
    ? findItem(groups, activeInstructionId)
    : undefined

  // ------------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------------

  const handleCompleteClick = useCallback((instructionId: string) => {
    setActiveInstructionId(instructionId)
    setCompleteDialogOpen(true)
  }, [])

  const handleSkipClick = useCallback((instructionId: string) => {
    setActiveInstructionId(instructionId)
    setSkipDialogOpen(true)
  }, [])

  const handleReportAvvik = useCallback(
    (instructionId: string) => {
      // Find the item to prefill NS 3451 code from the instruction's task group
      const item = findItem(groups, instructionId)
      const ns3451Code = item?.instruction.ns3451_code
      setAvvikPrefilledCode(ns3451Code ?? undefined)
      setAvvikDialogOpen(true)
    },
    [groups],
  )

  const handleAvvikFabClick = useCallback(() => {
    setAvvikPrefilledCode(undefined)
    setAvvikDialogOpen(true)
  }, [])

  const handleAvvikSuccess = useCallback(() => {
    setAvvikDialogOpen(false)
    setAvvikPrefilledCode(undefined)
  }, [])

  const handleAvvikCancel = useCallback(() => {
    setAvvikDialogOpen(false)
    setAvvikPrefilledCode(undefined)
  }, [])

  const handleCompleteConfirm = useCallback(
    async (noAvvikConfirmed: boolean, photos: CapturedPhoto[]) => {
      if (!assignmentId || !activeInstructionId) return

      const userId = useAuthStore.getState().profile?.id

      let gpsLat: number | undefined
      let gpsLng: number | undefined
      let gpsAccuracy: number | undefined

      try {
        const pos = await requestPosition()
        gpsLat = pos.latitude
        gpsLng = pos.longitude
        gpsAccuracy = pos.accuracy
      } catch {
        // GPS optional; proceed without
      }

      const taskExecution = await completeTask.mutateAsync({
        assignment_id: assignmentId,
        instruction_id: activeInstructionId,
        gps_lat: gpsLat,
        gps_lng: gpsLng,
        gps_accuracy: gpsAccuracy,
        no_avvik_confirmed: noAvvikConfirmed,
      })

      // Upload photos (best-effort — don't roll back task completion)
      if (photos.length > 0 && taskExecution && propertyId && userId) {
        try {
          await Promise.all(
            photos.map(async (photo) => {
              const { path } = await uploadPhoto(
                photo.file,
                propertyId,
                'task_execution',
                taskExecution.id,
              )
              await supabase.from('photos').insert({
                storage_path: path,
                entity_type: 'task_execution' as const,
                entity_id: taskExecution.id,
                gps_lat: photo.gpsCoords?.latitude ?? null,
                gps_lng: photo.gpsCoords?.longitude ?? null,
                uploaded_by: userId,
              })
            }),
          )
        } catch (err) {
          console.error('Photo upload failed:', err)
          toast.error(t('checklist.photoUploadFailed'))
        }
      }

      setCompleteDialogOpen(false)
      setActiveInstructionId(null)
    },
    [assignmentId, activeInstructionId, propertyId, requestPosition, completeTask, t],
  )

  const handleSkipConfirm = useCallback(
    async (reason: SkipReason, note?: string) => {
      if (!assignmentId || !activeInstructionId) return

      let gpsLat: number | undefined
      let gpsLng: number | undefined
      let gpsAccuracy: number | undefined

      try {
        const pos = await requestPosition()
        gpsLat = pos.latitude
        gpsLng = pos.longitude
        gpsAccuracy = pos.accuracy
      } catch {
        // GPS optional
      }

      await skipTask.mutateAsync({
        assignment_id: assignmentId,
        instruction_id: activeInstructionId,
        skip_reason: reason,
        skip_note: note,
        gps_lat: gpsLat,
        gps_lng: gpsLng,
        gps_accuracy: gpsAccuracy,
      })

      setSkipDialogOpen(false)
      setActiveInstructionId(null)
    },
    [assignmentId, activeInstructionId, requestPosition, skipTask],
  )

  // ------------------------------------------------------------------
  // Loading state
  // ------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-60" />
          <Skeleton className="h-3 w-full rounded-full" />
        </div>
        {[1, 2, 3].map((n) => (
          <div key={n} className="space-y-2">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
        ))}
      </div>
    )
  }

  // ------------------------------------------------------------------
  // Error state
  // ------------------------------------------------------------------

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <p className="text-sm text-muted-foreground">{tc('error')}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          {tc('retry')}
        </Button>
      </div>
    )
  }

  // ------------------------------------------------------------------
  // Progress
  // ------------------------------------------------------------------

  const progressPct = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
  const remaining = totalTasks - completedTasks

  // Separate overdue items for a highlighted section at the top
  const overdueItems: ChecklistItem[] = []
  for (const group of groups) {
    for (const item of group.items) {
      if (item.isOverdue && !item.isCompleted && !item.isSkipped) {
        overdueItems.push(item)
      }
    }
  }

  // Default all accordion groups to open
  const allGroupValues = groups.map((g) => g.ns3451Code)

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <h1 className="text-xl font-bold">{t('checklist.title')}</h1>

        {/* Progress text */}
        <p className="text-sm text-muted-foreground">
          {remaining > 0
            ? t('checklist.tasksRemaining', { count: remaining })
            : t('checklist.allCompleted')}
        </p>

        {/* Progress bar */}
        <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500 ease-out',
              progressPct === 100
                ? 'bg-accent-emerald-500'
                : 'bg-primary/50',
            )}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground text-right">
          {completedTasks}/{totalTasks}
        </p>
      </div>

      {/* Overdue section */}
      {overdueItems.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <h2 className="text-sm font-semibold text-destructive">
              {t('checklist.overdue')} ({overdueItems.length})
            </h2>
          </div>
          <div className="space-y-2 rounded-lg border-2 border-destructive/20 bg-destructive/5 p-3">
            {overdueItems.map((item) => (
              <TaskCard
                key={item.instruction.id}
                item={item}
                onComplete={handleCompleteClick}
                onSkip={handleSkipClick}
                onReportAvvik={handleReportAvvik}
              />
            ))}
          </div>
        </div>
      )}

      {/* Grouped accordion sections */}
      <Accordion
        type="multiple"
        defaultValue={allGroupValues}
        className="space-y-2"
      >
        {groups.map((group) => {
          return (
            <AccordionItem
              key={group.ns3451Code}
              value={group.ns3451Code}
              className="border-b-0"
            >
              <AccordionTrigger className="px-3 hover:no-underline">
                <div className="flex flex-1 items-center gap-2 pr-2">
                  <NS3451Badge code={group.ns3451Code} />
                  <span className="text-sm font-medium truncate">
                    {group.ns3451Title}
                  </span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {group.completedCount}/{group.totalCount}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-3">
                <div className="space-y-2">
                  {group.items.map((item) => (
                    <TaskCard
                      key={item.instruction.id}
                      item={item}
                      onComplete={handleCompleteClick}
                      onSkip={handleSkipClick}
                      onReportAvvik={handleReportAvvik}
                    />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>

      {/* Back button */}
      <Button
        variant="outline"
        size="lg"
        className="w-full"
        onClick={() => navigate(`/janitor/visit/${assignmentId}`)}
      >
        <ArrowLeft className="h-4 w-4" />
        {tc('back')}
      </Button>

      {/* Complete task dialog */}
      <CompleteTaskDialog
        open={completeDialogOpen}
        onOpenChange={setCompleteDialogOpen}
        onConfirm={handleCompleteConfirm}
        taskDescription={activeItem?.instruction.description ?? ''}
        photoRequired={activeItem?.instruction.photo_required ?? false}
        notifyBoard={activeItem?.instruction.notify_board ?? false}
        isSubmitting={completeTask.isPending}
      />

      {/* Skip task dialog */}
      <SkipTaskDialog
        open={skipDialogOpen}
        onOpenChange={setSkipDialogOpen}
        onConfirm={handleSkipConfirm}
        taskDescription={activeItem?.instruction.description ?? ''}
        isSubmitting={skipTask.isPending}
      />

      {/* Floating action button for avvik reporting */}
      {propertyId && (
        <button
          type="button"
          onClick={handleAvvikFabClick}
          className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent-amber-500 text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
          aria-label={t('avvik.new')}
        >
          <AlertTriangle className="h-6 w-6" />
        </button>
      )}

      {/* Avvik form dialog (full-screen on mobile) */}
      <Dialog open={avvikDialogOpen} onOpenChange={setAvvikDialogOpen}>
        <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-full max-w-full flex-col rounded-none border-0 sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-lg sm:border">
          <DialogHeader>
            <DialogTitle>{t('avvik.title')}</DialogTitle>
            <DialogDescription className="sr-only">
              {t('avvik.title')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-1">
            {propertyId && (
              <AvvikForm
                propertyId={propertyId}
                assignmentId={assignmentId}
                prefilledNS3451Code={avvikPrefilledCode}
                onSuccess={handleAvvikSuccess}
                onCancel={handleAvvikCancel}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
