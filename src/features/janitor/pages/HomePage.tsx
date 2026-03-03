import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { format, startOfDay, addDays, isToday, isTomorrow } from 'date-fns'
import { nb } from 'date-fns/locale'
import { CalendarDays, Clock } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { useMyAssignments } from '@/features/assignments/hooks/useAssignments'
import type { AssignmentWithProperty } from '@/features/assignments/hooks/useAssignments'
import { AssignmentCard } from '@/features/janitor/components/AssignmentCard'
import { InstructionUpdateBanner } from '@/features/janitor/components/InstructionUpdateBanner'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatSectionDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  if (isToday(date)) return 'I dag'
  if (isTomorrow(date)) return 'I morgen'
  return format(date, 'EEEE d. MMMM', { locale: nb })
}

function groupByDate(
  assignments: AssignmentWithProperty[],
): Record<string, AssignmentWithProperty[]> {
  const groups: Record<string, AssignmentWithProperty[]> = {}
  for (const a of assignments) {
    const key = a.scheduled_date
    if (!groups[key]) groups[key] = []
    groups[key].push(a)
  }
  return groups
}

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------

function AssignmentCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export function JanitorHomePage() {
  const { t } = useTranslation('janitor')
  const navigate = useNavigate()

  const today = useMemo(() => startOfDay(new Date()), [])
  const todayStr = format(today, 'yyyy-MM-dd')
  const weekEndStr = format(addDays(today, 7), 'yyyy-MM-dd')

  const { data: assignments, isLoading } = useMyAssignments(todayStr, weekEndStr)

  // Split into today vs. upcoming
  const { todayAssignments, upcomingAssignments, todayEstimatedHours } = useMemo(() => {
    if (!assignments) {
      return { todayAssignments: [], upcomingAssignments: [], todayEstimatedHours: 0 }
    }

    const todayItems: AssignmentWithProperty[] = []
    const upcomingItems: AssignmentWithProperty[] = []
    let hours = 0

    for (const a of assignments) {
      if (a.scheduled_date === todayStr) {
        todayItems.push(a)
        hours += a.property.estimated_weekly_hours ?? 0
      } else {
        upcomingItems.push(a)
      }
    }

    return {
      todayAssignments: todayItems,
      upcomingAssignments: upcomingItems,
      todayEstimatedHours: hours,
    }
  }, [assignments, todayStr])

  const upcomingGrouped = useMemo(
    () => groupByDate(upcomingAssignments),
    [upcomingAssignments],
  )

  const handleTap = (id: string) => {
    navigate(`/janitor/visit/${id}`)
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('home.title')}</h1>
        <span className="text-sm text-muted-foreground">
          {format(today, 'd. MMMM yyyy', { locale: nb })}
        </span>
      </div>

      {/* Instruction update banner */}
      <InstructionUpdateBanner />

      {/* Today section */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t('home.today')}</h2>
          {!isLoading && todayAssignments.length > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                {t('home.estimatedHours')}: {todayEstimatedHours.toFixed(1)}t
              </span>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <AssignmentCardSkeleton />
            <AssignmentCardSkeleton />
            <AssignmentCardSkeleton />
          </div>
        ) : todayAssignments.length === 0 ? (
          <EmptyState
            icon={<CalendarDays />}
            title={t('home.noAssignments')}
          />
        ) : (
          <div className="space-y-3">
            {todayAssignments.map((a) => (
              <AssignmentCard key={a.id} assignment={a} onTap={handleTap} />
            ))}
          </div>
        )}
      </section>

      {/* Upcoming section */}
      {!isLoading && upcomingAssignments.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">{t('home.upcoming')}</h2>
          <div className="space-y-4">
            {Object.entries(upcomingGrouped)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([date, items]) => (
                <div key={date}>
                  <h3 className="mb-2 text-sm font-medium capitalize text-muted-foreground">
                    {formatSectionDate(date)}
                  </h3>
                  <div className="space-y-3">
                    {items.map((a) => (
                      <AssignmentCard key={a.id} assignment={a} onTap={handleTap} />
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}
    </div>
  )
}
