import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { nb } from 'date-fns/locale'
import {
  Building2,
  Clock,
  CheckCircle2,
  SkipForward,
  AlertTriangle,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { useAssignment, useCheckOut } from '@/features/assignments/hooks/useAssignments'
import { useChecklist } from '@/features/janitor/hooks/useChecklist'
import { useCreateTimeLog } from '@/features/janitor/hooks/useTimeLogs'
import { useGPS } from '@/hooks/useGPS'
import { useVisitStore } from '@/stores/visitStore'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { IncompleteTasksDialog } from '@/features/janitor/components/IncompleteTasksDialog'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimer(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600)
  const mins = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60
  return [hrs, mins, secs].map((n) => String(n).padStart(2, '0')).join(':')
}

function formatMinutesToDisplay(minutes: number): string {
  const hrs = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hrs === 0) return `${mins} min`
  return `${hrs}t ${mins}m`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CheckoutPage() {
  const { t } = useTranslation('janitor')
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // Data
  const { data: assignment, isLoading: assignmentLoading } = useAssignment(id)
  const {
    groups,
    totalTasks,
    completedTasks,
    isLoading: checklistLoading,
  } = useChecklist(id, assignment?.property_id)

  // Mutations
  const checkOutMutation = useCheckOut()
  const createTimeLogMutation = useCreateTimeLog()
  const { requestPosition } = useGPS()

  // Visit store
  const { elapsedSeconds, setElapsedSeconds, timerRunning, endVisit } =
    useVisitStore()

  // Local state
  const [showIncompleteDialog, setShowIncompleteDialog] = useState(false)
  const [incompleteChecked, setIncompleteChecked] = useState(false)
  const [checkoutNote, setCheckoutNote] = useState('')
  const [manualMinutes, setManualMinutes] = useState<string>('')
  const [useManualTime, setUseManualTime] = useState(false)
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [avvikCount, setAvvikCount] = useState(0)

  // Timer tick (continue running while on checkout page)
  useEffect(() => {
    if (!timerRunning) return
    const interval = setInterval(() => {
      setElapsedSeconds(elapsedSeconds + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [timerRunning, elapsedSeconds, setElapsedSeconds])

  // Restore timer from assignment if store is empty (page refresh)
  useEffect(() => {
    if (
      assignment &&
      assignment.status === 'in_progress' &&
      assignment.checkin_at &&
      elapsedSeconds === 0
    ) {
      const checkinDate = new Date(assignment.checkin_at)
      const elapsed = Math.floor((Date.now() - checkinDate.getTime()) / 1000)
      setElapsedSeconds(Math.max(0, elapsed))
    }
  }, [assignment, elapsedSeconds, setElapsedSeconds])

  // Fetch avvik count for this assignment
  useEffect(() => {
    if (!id) return
    let cancelled = false

    async function fetchAvvikCount() {
      const { count } = await supabase
        .from('avvik')
        .select('*', { count: 'exact', head: true })
        .eq('assignment_id', id!)

      if (!cancelled && count != null) {
        setAvvikCount(count)
      }
    }

    void fetchAvvikCount()
    return () => {
      cancelled = true
    }
  }, [id])

  // Derive incomplete tasks
  const incompleteTasks = useMemo(() => {
    const result: { description: string; ns3451Code?: string }[] = []
    for (const group of groups) {
      for (const item of group.items) {
        if (!item.isCompleted && !item.isSkipped) {
          result.push({
            description: item.instruction.description,
            ns3451Code: item.instruction.ns3451?.code,
          })
        }
      }
    }
    return result
  }, [groups])

  const skippedTasks = useMemo(() => {
    let count = 0
    for (const group of groups) {
      for (const item of group.items) {
        if (item.isSkipped) count++
      }
    }
    return count
  }, [groups])

  const doneTasks = useMemo(() => {
    let count = 0
    for (const group of groups) {
      for (const item of group.items) {
        if (item.isCompleted) count++
      }
    }
    return count
  }, [groups])

  // Calculated time
  const autoMinutes = Math.floor(elapsedSeconds / 60)
  const actualMinutes = useManualTime
    ? parseInt(manualMinutes, 10) || autoMinutes
    : autoMinutes
  const budgetedMinutes = (assignment?.property.estimated_weekly_hours ?? 0) * 60

  // ------------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------------

  const handleInitiateCheckout = useCallback(() => {
    // If there are incomplete tasks and user hasn't already confirmed, show dialog
    if (incompleteTasks.length > 0 && !incompleteChecked) {
      setShowIncompleteDialog(true)
      return
    }

    // Otherwise proceed to actual checkout
    void performCheckout()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incompleteTasks, incompleteChecked])

  const handleConfirmIncomplete = useCallback(() => {
    setIncompleteChecked(true)
    setShowIncompleteDialog(false)
    // Don't auto-submit — let the user review the form and click checkout
  }, [])

  const handleGoBack = useCallback(() => {
    setShowIncompleteDialog(false)
    navigate(`/janitor/visit/${id}/checklist`)
  }, [navigate, id])

  const performCheckout = useCallback(async () => {
    if (!id || !assignment) return
    setIsCheckingOut(true)

    try {
      // 1. Get GPS
      let lat: number | null = null
      let lng: number | null = null
      let accuracy: number | null = null

      try {
        const pos = await requestPosition()
        lat = pos.latitude
        lng = pos.longitude
        accuracy = pos.accuracy
      } catch {
        // GPS is optional
      }

      // 2. Calculate final minutes
      const finalMinutes = actualMinutes

      // 3. Call checkout mutation
      await checkOutMutation.mutateAsync({
        id,
        checkout_lat: lat,
        checkout_lng: lng,
        checkout_accuracy: accuracy,
        checkout_note: checkoutNote || null,
        actual_minutes: finalMinutes,
      })

      // 4. Create time log
      const profile = useAuthStore.getState().profile
      if (profile && assignment.checkin_at) {
        try {
          await createTimeLogMutation.mutateAsync({
            janitor_id: profile.id,
            property_id: assignment.property_id,
            assignment_id: id,
            check_in_at: assignment.checkin_at,
            check_out_at: new Date().toISOString(),
            actual_minutes: finalMinutes,
            note: checkoutNote || undefined,
            status: 'draft',
          })
        } catch {
          // Time log creation is secondary; don't block checkout
          console.warn('Failed to create time log')
        }
      }

      // 5. Clear visit store
      endVisit()

      // 6. Show success and navigate to summary
      toast.success(t('checkout.submitted'))
      navigate(`/janitor/visit/${id}/summary`, { replace: true })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Checkout failed',
      )
    } finally {
      setIsCheckingOut(false)
    }
  }, [
    id,
    assignment,
    actualMinutes,
    checkoutNote,
    requestPosition,
    checkOutMutation,
    createTimeLogMutation,
    endVisit,
    navigate,
    t,
  ])

  // ------------------------------------------------------------------
  // Loading state
  // ------------------------------------------------------------------

  if (assignmentLoading || checklistLoading || !assignment) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  // ------------------------------------------------------------------
  // On first render, check for incomplete tasks
  // ------------------------------------------------------------------

  const hasIncompleteTasks = incompleteTasks.length > 0

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <LogOut className="h-6 w-6 text-coor-blue-500" />
        <h1 className="text-xl font-bold">{t('checkout.title')}</h1>
      </div>

      {/* Visit Summary Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            {t('checkout.visitSummary')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{assignment.property.name}</span>
          </div>

          {assignment.checkin_at && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {t('checkout.checkinTime')}
              </span>
              <span>
                {format(new Date(assignment.checkin_at), 'HH:mm')}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {t('checkout.elapsedTime')}
            </span>
            <span className="font-mono font-semibold tabular-nums">
              {formatTimer(elapsedSeconds)}
            </span>
          </div>

          {budgetedMinutes > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {t('visit.budgetedTime')}
              </span>
              <span>{formatMinutesToDisplay(budgetedMinutes)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Task Summary Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t('checkout.summary')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-coor-green-500" />
              {t('checkout.tasksDone')}
            </span>
            <Badge variant="success">{doneTasks}</Badge>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <SkipForward className="h-4 w-4 text-coor-orange-500" />
              {t('checkout.tasksSkipped')}
            </span>
            <Badge variant="warning">{skippedTasks}</Badge>
          </div>

          {hasIncompleteTasks && (
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                {t('checkout.tasksIncomplete')}
              </span>
              <Badge variant="destructive">{incompleteTasks.length}</Badge>
            </div>
          )}

          {avvikCount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                {t('checkout.avvikReported')}
              </span>
              <Badge variant="destructive">{avvikCount}</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Time Entry */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-muted-foreground" />
            {t('checkout.timeSpent')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Auto-calculated time */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {t('visit.actualTime')}
            </span>
            <span className="font-semibold">
              {formatMinutesToDisplay(autoMinutes)}
            </span>
          </div>

          {budgetedMinutes > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {t('checkout.vsBudget')}
              </span>
              <span
                className={cn(
                  'font-medium',
                  autoMinutes <= budgetedMinutes
                    ? 'text-coor-green-500'
                    : 'text-destructive',
                )}
              >
                {autoMinutes <= budgetedMinutes ? '-' : '+'}
                {formatMinutesToDisplay(Math.abs(autoMinutes - budgetedMinutes))}
              </span>
            </div>
          )}

          {/* Manual adjust toggle */}
          <div className="border-t border-border pt-3">
            <label className="flex min-h-[44px] cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                className="h-5 w-5 rounded border-border accent-coor-blue-500"
                checked={useManualTime}
                onChange={(e) => {
                  setUseManualTime(e.target.checked)
                  if (e.target.checked) {
                    setManualMinutes(String(autoMinutes))
                  }
                }}
              />
              <span className="text-sm">{t('checkout.adjustTime')}</span>
            </label>

            {useManualTime && (
              <div className="mt-2 flex items-center gap-2">
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={manualMinutes}
                  onChange={(e) => setManualMinutes(e.target.value)}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">
                  {t('visit.minutes')}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Checkout Note */}
      <div>
        <label
          htmlFor="checkout-note"
          className="mb-1.5 block text-sm font-medium"
        >
          {t('checkout.note')}
        </label>
        <Textarea
          id="checkout-note"
          rows={3}
          placeholder={t('checkout.notePlaceholder')}
          value={checkoutNote}
          onChange={(e) => setCheckoutNote(e.target.value)}
        />
      </div>

      {/* Checkout Button */}
      <Button
        size="lg"
        className="h-14 w-full text-lg font-semibold"
        onClick={handleInitiateCheckout}
        disabled={isCheckingOut}
      >
        {isCheckingOut ? (
          <>
            <Spinner size="sm" className="text-white" />
            <span>{t('checkout.checkingOut')}</span>
          </>
        ) : (
          t('checkout.confirmSubmit')
        )}
      </Button>

      {/* Incomplete Tasks Dialog */}
      <IncompleteTasksDialog
        open={showIncompleteDialog}
        onOpenChange={setShowIncompleteDialog}
        incompleteTasks={incompleteTasks}
        onGoBack={handleGoBack}
        onConfirmCheckout={handleConfirmIncomplete}
      />
    </div>
  )
}
