import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { nb } from 'date-fns/locale'
import {
  CheckCircle2,
  Building2,
  MapPin,
  Clock,
  SkipForward,
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { useAssignment } from '@/features/assignments/hooks/useAssignments'
import { useTaskExecutions } from '@/features/assignments/hooks/useTaskExecutions'
import { supabase } from '@/lib/supabase'
import type { Avvik } from '@/types/database'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMinutesToDisplay(minutes: number): string {
  const hrs = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hrs === 0) return `${mins} min`
  return `${hrs}t ${mins}m`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VisitSummaryPage() {
  const { t } = useTranslation('janitor')
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  // Data
  const { data: assignment, isLoading: assignmentLoading } = useAssignment(id)
  const { data: executions, isLoading: executionsLoading } =
    useTaskExecutions(id)

  // Avvik for this assignment
  const [avvik, setAvvik] = useState<Avvik[]>([])
  const [avvikLoading, setAvvikLoading] = useState(true)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false

    async function fetchAvvik() {
      const { data } = await supabase
        .from('avvik')
        .select('*')
        .eq('assignment_id', id!)
        .order('created_at', { ascending: false })

      if (!cancelled) {
        setAvvik(data ?? [])
        setAvvikLoading(false)
      }
    }

    void fetchAvvik()
    return () => {
      cancelled = true
    }
  }, [id])

  // Derive task counts
  const taskCounts = useMemo(() => {
    if (!executions) return { total: 0, done: 0, skipped: 0 }
    const done = executions.filter((e) => e.status === 'done').length
    const skipped = executions.filter((e) => e.status === 'skipped').length
    return { total: done + skipped, done, skipped }
  }, [executions])

  // ------------------------------------------------------------------
  // Loading state
  // ------------------------------------------------------------------

  if (assignmentLoading || executionsLoading || !assignment) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  // Derived values
  const actualMinutes = assignment.actual_minutes ?? 0
  const budgetedMinutes =
    (assignment.property.estimated_weekly_hours ?? 0) * 60
  const timeDiff = actualMinutes - budgetedMinutes
  const isUnderBudget = timeDiff <= 0

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header with green check */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-coor-green-500/10">
          <CheckCircle2 className="h-6 w-6 text-coor-green-500" />
        </div>
        <h1 className="text-xl font-bold">{t('summary.title')}</h1>
      </div>

      {/* Property Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            {t('summary.propertyInfo')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="font-medium">{assignment.property.name}</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            <span>{assignment.property.address}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {format(
              new Date(assignment.scheduled_date + 'T00:00:00'),
              'EEEE d. MMMM yyyy',
              { locale: nb },
            )}
          </p>
        </CardContent>
      </Card>

      {/* Time Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-muted-foreground" />
            {t('summary.timeInfo')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {assignment.checkin_at && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {t('summary.checkinTime')}
              </span>
              <span>{format(new Date(assignment.checkin_at), 'HH:mm')}</span>
            </div>
          )}

          {assignment.checkout_at && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {t('summary.checkoutTime')}
              </span>
              <span>
                {format(new Date(assignment.checkout_at), 'HH:mm')}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {t('summary.totalTime')}
            </span>
            <span className="font-semibold">
              {formatMinutesToDisplay(actualMinutes)}
            </span>
          </div>

          {budgetedMinutes > 0 && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {t('summary.budgetedTime')}
                </span>
                <span>{formatMinutesToDisplay(budgetedMinutes)}</span>
              </div>

              <div className="flex items-center justify-between border-t border-border pt-2 text-sm">
                <span className="text-muted-foreground">
                  {isUnderBudget
                    ? t('summary.underBudget')
                    : t('summary.overBudget')}
                </span>
                <Badge variant={isUnderBudget ? 'success' : 'destructive'}>
                  {isUnderBudget ? '-' : '+'}
                  {formatMinutesToDisplay(Math.abs(timeDiff))}
                </Badge>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Task Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {t('summary.taskSummary')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {t('summary.totalTasks')}
            </span>
            <span className="font-medium">{taskCounts.total}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-coor-green-500" />
              {t('summary.completed')}
            </span>
            <Badge variant="success">{taskCounts.done}</Badge>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <SkipForward className="h-4 w-4 text-coor-orange-500" />
              {t('summary.skipped')}
            </span>
            <Badge variant="warning">{taskCounts.skipped}</Badge>
          </div>

          {/* Expandable task details */}
          {executions && executions.length > 0 && (
            <div className="border-t border-border pt-2">
              <button
                type="button"
                className="flex min-h-[44px] w-full items-center justify-between text-sm text-muted-foreground"
                onClick={() => setShowDetails(!showDetails)}
              >
                <span>{t('summary.viewDetails')}</span>
                {showDetails ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              {showDetails && (
                <ul className="mt-2 space-y-1">
                  {executions.map((exec) => (
                    <li
                      key={exec.id}
                      className="flex items-center gap-2 rounded px-2 py-1.5 text-sm"
                    >
                      {exec.status === 'done' ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-coor-green-500" />
                      ) : (
                        <SkipForward className="h-4 w-4 shrink-0 text-coor-orange-500" />
                      )}
                      <span className="min-w-0 flex-1 truncate">
                        {exec.instruction?.description ?? exec.instruction_id}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Avvik Section */}
      {!avvikLoading && avvik.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              {t('summary.avvikSection')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {t('summary.avvikCount', { count: avvik.length })}
            </p>
            <ul className="space-y-1">
              {avvik.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between rounded px-2 py-1.5 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate">
                    {a.description}
                  </span>
                  <Badge
                    variant={
                      a.severity === 'high'
                        ? 'destructive'
                        : a.severity === 'medium'
                          ? 'warning'
                          : 'secondary'
                    }
                    className="ml-2 shrink-0"
                  >
                    {a.severity}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Checkout note */}
      {assignment.checkout_note && (
        <Card>
          <CardContent className="p-4">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              {t('checkout.note')}
            </span>
            <p className="text-sm">{assignment.checkout_note}</p>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="space-y-3 pb-4">
        <Button
          size="lg"
          className="h-14 w-full text-lg font-semibold"
          onClick={() => navigate('/janitor')}
        >
          <ArrowLeft className="h-5 w-5" />
          {t('summary.backToAssignments')}
        </Button>
      </div>
    </div>
  )
}
