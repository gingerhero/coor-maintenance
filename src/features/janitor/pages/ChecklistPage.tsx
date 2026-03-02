import { useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'
import { NS3451Badge } from '@/components/ns3451/NS3451Badge'
import { getCategoryColor } from '@/components/ns3451/ns3451-colors'
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
    (_instructionId: string) => {
      // Avvik reporting will be integrated in a future sprint.
      // Navigate to the avvik page for now.
      navigate(`/janitor/avvik`)
    },
    [navigate],
  )

  const handleCompleteConfirm = useCallback(
    async (noAvvikConfirmed: boolean) => {
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
        // GPS optional; proceed without
      }

      await completeTask.mutateAsync({
        assignment_id: assignmentId,
        instruction_id: activeInstructionId,
        gps_lat: gpsLat,
        gps_lng: gpsLng,
        gps_accuracy: gpsAccuracy,
        no_avvik_confirmed: noAvvikConfirmed,
      })

      setCompleteDialogOpen(false)
      setActiveInstructionId(null)
    },
    [assignmentId, activeInstructionId, requestPosition, completeTask],
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
                ? 'bg-coor-green-500'
                : 'bg-coor-blue-500',
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
          const color = getCategoryColor(group.ns3451Code)
          return (
            <AccordionItem
              key={group.ns3451Code}
              value={group.ns3451Code}
              className={cn('rounded-lg border-l-4', color.border)}
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
    </div>
  )
}
