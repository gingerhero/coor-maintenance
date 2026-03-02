import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { format, parseISO, differenceInMinutes } from 'date-fns'
import { nb } from 'date-fns/locale'
import {
  Building2,
  MapPin,
  Clock,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  SkipForward,
  AlertTriangle,
  CalendarDays,
  StickyNote,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Separator } from '@/components/ui/separator'
import {
  useAssignmentHistory,
  useAssignmentDetail,
  type HistoryAssignment,
} from '@/features/assignments/hooks/useAssignmentHistory'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(minutes: number | null): string {
  if (minutes == null) return '-'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}t`
  return `${h}t ${m}m`
}

function formatTime(isoString: string | null): string {
  if (!isoString) return '-'
  return format(parseISO(isoString), 'HH:mm')
}

function groupByMonth(
  assignments: HistoryAssignment[],
): Array<{ key: string; label: string; items: HistoryAssignment[] }> {
  const groups = new Map<string, { label: string; items: HistoryAssignment[] }>()

  for (const a of assignments) {
    const date = parseISO(a.scheduled_date)
    const key = format(date, 'yyyy-MM')
    const label = format(date, 'MMMM yyyy', { locale: nb })
    // Capitalize first letter
    const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1)

    if (!groups.has(key)) {
      groups.set(key, { label: capitalizedLabel, items: [] })
    }
    groups.get(key)!.items.push(a)
  }

  return Array.from(groups.entries()).map(([key, value]) => ({
    key,
    ...value,
  }))
}

// ---------------------------------------------------------------------------
// Expandable detail section
// ---------------------------------------------------------------------------

function HistoryCardDetail({ assignmentId }: { assignmentId: string }) {
  const { t } = useTranslation('janitor')
  const { data, isLoading } = useAssignmentDetail(assignmentId)

  if (isLoading) {
    return (
      <div className="space-y-2 px-1 pt-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    )
  }

  if (!data) return null

  const doneTasks = data.task_executions.filter((te) => te.status === 'done')
  const skippedTasks = data.task_executions.filter((te) => te.status === 'skipped')

  return (
    <div className="space-y-3 pt-3">
      <Separator />

      {/* Tasks done */}
      {doneTasks.length > 0 && (
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-foreground">
            <CheckCircle2 className="h-4 w-4 text-coor-green-500" />
            {t('history.tasksDone')} ({doneTasks.length})
          </p>
          <ul className="space-y-1 pl-6">
            {doneTasks.map((te) => (
              <li key={te.id} className="text-sm text-muted-foreground">
                {te.instruction?.description ?? '-'}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tasks skipped */}
      {skippedTasks.length > 0 && (
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-foreground">
            <SkipForward className="h-4 w-4 text-coor-orange-500" />
            {t('history.tasksSkipped')} ({skippedTasks.length})
          </p>
          <ul className="space-y-1 pl-6">
            {skippedTasks.map((te) => (
              <li key={te.id} className="text-sm text-muted-foreground">
                <span>{te.instruction?.description ?? '-'}</span>
                {te.skip_reason && (
                  <span className="ml-1 text-xs text-muted-foreground/70">
                    ({te.skip_reason === 'other' ? te.skip_note : t(`skip.${te.skip_reason}`)})
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Check-in note */}
      {data.checkin_note && (
        <div className="flex items-start gap-2">
          <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">{t('history.checkinNote')}</p>
            <p className="text-sm text-muted-foreground">{data.checkin_note}</p>
          </div>
        </div>
      )}

      {/* Check-out note */}
      {data.checkout_note && (
        <div className="flex items-start gap-2">
          <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">{t('history.checkoutNote')}</p>
            <p className="text-sm text-muted-foreground">{data.checkout_note}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// History card
// ---------------------------------------------------------------------------

function HistoryCard({ assignment }: { assignment: HistoryAssignment }) {
  const { t } = useTranslation('janitor')
  const [expanded, setExpanded] = useState(false)

  const taskCount = assignment.task_executions?.[0]?.count ?? 0
  const avvikCount = assignment.avvik?.[0]?.count ?? 0

  // Compute duration from check-in/check-out if actual_minutes not set
  const duration =
    assignment.actual_minutes ??
    (assignment.checkin_at && assignment.checkout_at
      ? differenceInMinutes(parseISO(assignment.checkout_at), parseISO(assignment.checkin_at))
      : null)

  const dateFormatted = format(parseISO(assignment.scheduled_date), 'd. MMMM yyyy', { locale: nb })

  // For the progress bar, we use task count as total and assume all done for completed assignments
  // The actual done count will be shown in detail view
  const progressPercent = taskCount > 0 ? 100 : 0

  return (
    <Card
      className={cn(
        'cursor-pointer transition-shadow hover:shadow-md active:shadow-sm',
        'min-h-[44px]',
      )}
      role="button"
      tabIndex={0}
      onClick={() => setExpanded((prev) => !prev)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setExpanded((prev) => !prev)
        }
      }}
    >
      <CardContent className="p-4">
        {/* Main row */}
        <div className="flex items-start justify-between gap-3">
          {/* Left: property + meta */}
          <div className="min-w-0 flex-1 space-y-1.5">
            {/* Property name */}
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate text-base font-semibold">{assignment.property.name}</span>
            </div>

            {/* Address */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{assignment.property.address}</span>
            </div>

            {/* Date */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
              <span>{dateFormatted}</span>
            </div>

            {/* Time range and duration */}
            {(assignment.checkin_at || assignment.checkout_at) && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {formatTime(assignment.checkin_at)} - {formatTime(assignment.checkout_at)}
                  {duration != null && (
                    <span className="ml-1.5 text-xs">({formatDuration(duration)})</span>
                  )}
                </span>
              </div>
            )}

            {/* Task progress bar */}
            {taskCount > 0 && (
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-coor-green-500 transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="whitespace-nowrap text-xs text-muted-foreground">
                  {taskCount} {t('history.tasks')}
                </span>
              </div>
            )}
          </div>

          {/* Right: badges + expand icon */}
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <Badge variant="secondary">{t('home.status.completed')}</Badge>
            {avvikCount > 0 && (
              <Badge variant="warning" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {avvikCount} {t('history.avvik')}
              </Badge>
            )}
            <div className="mt-1 text-muted-foreground">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </div>
        </div>

        {/* Expanded detail */}
        {expanded && <HistoryCardDetail assignmentId={assignment.id} />}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function HistoryListSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-5 w-40" />
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-36 w-full rounded-lg" />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function JanitorHistoryPage() {
  const { t } = useTranslation('janitor')
  const { data: assignments, isLoading } = useAssignmentHistory()

  const monthGroups = useMemo(
    () => (assignments ? groupByMonth(assignments) : []),
    [assignments],
  )

  if (isLoading) {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-bold">{t('history.title')}</h1>
        <HistoryListSkeleton />
      </div>
    )
  }

  if (!assignments || assignments.length === 0) {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-bold">{t('history.title')}</h1>
        <EmptyState
          icon={<CalendarDays />}
          title={t('history.noHistory')}
          description={t('history.noHistoryDescription')}
        />
      </div>
    )
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t('history.title')}</h1>

      <div className="space-y-6">
        {monthGroups.map((group) => (
          <section key={group.key}>
            <h2 className="mb-3 text-lg font-semibold text-foreground">{group.label}</h2>
            <div className="space-y-3">
              {group.items.map((assignment) => (
                <HistoryCard key={assignment.id} assignment={assignment} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
