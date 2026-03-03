import { useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  addWeeks,
  subWeeks,
  getWeek,
  isToday,
} from 'date-fns'
import { nb } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, Clock, Send } from 'lucide-react'

import { cn } from '@/lib/utils'
import { minutesToDisplay } from '@/lib/time-utils'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { useAuthStore } from '@/stores/authStore'
import { useProperties } from '@/features/properties/hooks/useProperties'
import {
  useWeeklyTimeSummary,
  useCreateTimeLog,
  useSubmitWeekTimeLogs,
  type TimeLogWithProperty,
} from '@/features/janitor/hooks/useTimeLogs'
import { useMyCurrentRoster } from '@/features/janitor/hooks/useMyRoster'
import type { TimeLogStatus } from '@/types/database'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStatusVariant(
  status: TimeLogStatus,
): 'secondary' | 'warning' | 'success' {
  switch (status) {
    case 'draft':
      return 'secondary'
    case 'submitted':
      return 'warning'
    case 'approved':
      return 'success'
  }
}

// ---------------------------------------------------------------------------
// Day row component
// ---------------------------------------------------------------------------

interface DayRowProps {
  date: Date
  logs: TimeLogWithProperty[]
  t: (key: string) => string
}

function DayRow({ date, logs, t }: DayRowProps) {
  const dayName = format(date, 'EEE', { locale: nb })
  const dayNum = format(date, 'd.', { locale: nb })
  const totalMinutes = logs.reduce((sum, l) => sum + l.actual_minutes, 0)
  const today = isToday(date)

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border border-border p-3',
        today && 'border-coor-blue-500/40 bg-coor-blue-500/5',
      )}
    >
      {/* Day label */}
      <div className="flex w-12 shrink-0 flex-col items-center">
        <span
          className={cn(
            'text-xs font-medium uppercase',
            today ? 'text-coor-blue-500' : 'text-muted-foreground',
          )}
        >
          {dayName}
        </span>
        <span
          className={cn(
            'text-lg font-bold leading-tight',
            today ? 'text-coor-blue-500' : 'text-foreground',
          )}
        >
          {dayNum}
        </span>
      </div>

      {/* Logs or empty */}
      <div className="flex-1 space-y-1.5">
        {logs.length === 0 ? (
          <span className="text-sm text-muted-foreground">-</span>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="flex min-h-[44px] items-center justify-between gap-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {log.property.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {minutesToDisplay(log.actual_minutes)}
                </p>
              </div>
              <Badge variant={getStatusVariant(log.status)}>
                {t(`time.status.${log.status}`)}
              </Badge>
            </div>
          ))
        )}
      </div>

      {/* Day total */}
      {totalMinutes > 0 && (
        <div className="shrink-0 text-right">
          <span className="text-sm font-semibold text-foreground">
            {minutesToDisplay(totalMinutes)}
          </span>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Manual time entry dialog
// ---------------------------------------------------------------------------

interface ManualEntryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  t: (key: string) => string
}

function ManualEntryDialog({ open, onOpenChange, t }: ManualEntryDialogProps) {
  const profile = useAuthStore((s) => s.profile)
  const { data: properties } = useProperties()
  const createTimeLog = useCreateTimeLog()

  const [propertyId, setPropertyId] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [hours, setHours] = useState(0)
  const [minutes, setMinutes] = useState(0)
  const [note, setNote] = useState('')

  const resetForm = useCallback(() => {
    setPropertyId('')
    setDate(format(new Date(), 'yyyy-MM-dd'))
    setHours(0)
    setMinutes(0)
    setNote('')
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile || !propertyId) return

    const totalMinutes = hours * 60 + minutes
    if (totalMinutes <= 0) return

    createTimeLog.mutate(
      {
        janitor_id: profile.id,
        property_id: propertyId,
        assignment_id: '',
        check_in_at: `${date}T00:00:00`,
        check_out_at: `${date}T00:00:00`,
        actual_minutes: totalMinutes,
        note: note || undefined,
        status: 'draft',
      },
      {
        onSuccess: () => {
          resetForm()
          onOpenChange(false)
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('time.addManual')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Property selector */}
          <div className="space-y-1.5">
            <label
              htmlFor="time-property"
              className="text-sm font-medium text-foreground"
            >
              {t('time.property')}
            </label>
            <select
              id="time-property"
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              required
              className="flex h-11 min-h-[44px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-coor-blue-500 focus:ring-offset-2"
            >
              <option value="">{t('time.property')}...</option>
              {properties?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date picker */}
          <div className="space-y-1.5">
            <label
              htmlFor="time-date"
              className="text-sm font-medium text-foreground"
            >
              {t('time.date')}
            </label>
            <input
              id="time-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="flex h-11 min-h-[44px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-coor-blue-500 focus:ring-offset-2"
            />
          </div>

          {/* Hours & Minutes */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label
                htmlFor="time-hours"
                className="text-sm font-medium text-foreground"
              >
                {t('time.hours')}
              </label>
              <input
                id="time-hours"
                type="number"
                min={0}
                max={23}
                value={hours}
                onChange={(e) => setHours(Math.max(0, Number(e.target.value)))}
                className="flex h-11 min-h-[44px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-coor-blue-500 focus:ring-offset-2"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="time-minutes"
                className="text-sm font-medium text-foreground"
              >
                {t('time.minutes')}
              </label>
              <input
                id="time-minutes"
                type="number"
                min={0}
                max={59}
                value={minutes}
                onChange={(e) =>
                  setMinutes(Math.min(59, Math.max(0, Number(e.target.value))))
                }
                className="flex h-11 min-h-[44px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-coor-blue-500 focus:ring-offset-2"
              />
            </div>
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <label
              htmlFor="time-note"
              className="text-sm font-medium text-foreground"
            >
              {t('time.note')}
            </label>
            <textarea
              id="time-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('time.notePlaceholder')}
              rows={3}
              className="flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-coor-blue-500 focus:ring-offset-2"
            />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={
              !propertyId ||
              (hours === 0 && minutes === 0) ||
              createTimeLog.isPending
            }
          >
            {t('time.submit')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Weekly summary skeleton
// ---------------------------------------------------------------------------

function WeeklySkeleton() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="mb-2 h-8 w-24" />
          <Skeleton className="h-3 w-full rounded-full" />
        </CardContent>
      </Card>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export function TimePage() {
  const { t } = useTranslation('janitor')
  const profile = useAuthStore((s) => s.profile)
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  )

  // Derived date values
  const weekEnd = useMemo(
    () => endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
    [currentWeekStart],
  )
  const weekStartStr = format(currentWeekStart, 'yyyy-MM-dd')
  const weekEndStr = format(weekEnd, 'yyyy-MM-dd')
  const weekNumber = getWeek(currentWeekStart, { weekStartsOn: 1 })
  const daysOfWeek = useMemo(
    () => eachDayOfInterval({ start: currentWeekStart, end: weekEnd }),
    [currentWeekStart, weekEnd],
  )

  // Navigation label: "24. feb - 2. mar"
  const weekLabel = useMemo(() => {
    const start = format(currentWeekStart, 'd. MMM', { locale: nb })
    const end = format(weekEnd, 'd. MMM', { locale: nb })
    return `${start} \u2013 ${end}`
  }, [currentWeekStart, weekEnd])

  // Fetch weekly logs
  const { data: weeklyLogs, isLoading } = useWeeklyTimeSummary(
    weekStartStr,
    weekEndStr,
  )

  // Group logs by date
  const logsByDate = useMemo(() => {
    const map = new Map<string, TimeLogWithProperty[]>()
    for (const day of daysOfWeek) {
      map.set(format(day, 'yyyy-MM-dd'), [])
    }
    if (weeklyLogs) {
      for (const log of weeklyLogs) {
        const dateKey = log.date
        const existing = map.get(dateKey) ?? []
        existing.push(log)
        map.set(dateKey, existing)
      }
    }
    return map
  }, [weeklyLogs, daysOfWeek])

  // Weekly totals
  const totalMinutes = useMemo(
    () => weeklyLogs?.reduce((sum, l) => sum + l.actual_minutes, 0) ?? 0,
    [weeklyLogs],
  )
  const totalHours = totalMinutes / 60

  // Budgeted hours from roster entries
  const { data: rosterEntries } = useMyCurrentRoster()
  const budgetedHours = useMemo(
    () => rosterEntries?.reduce((sum, entry) => sum + (entry.budgeted_weekly_hours ?? 0), 0) ?? 0,
    [rosterEntries],
  )

  // Progress percentage (capped at 100%)
  const progressPct = Math.min(100, (totalHours / budgetedHours) * 100)

  // Submit week
  const submitWeek = useSubmitWeekTimeLogs()
  const hasDraftLogs = useMemo(
    () => weeklyLogs?.some((l) => l.status === 'draft') ?? false,
    [weeklyLogs],
  )

  // Manual entry dialog
  const [showManualEntry, setShowManualEntry] = useState(false)

  // Navigation handlers
  const goToPrevWeek = useCallback(
    () => setCurrentWeekStart((w) => subWeeks(w, 1)),
    [],
  )
  const goToNextWeek = useCallback(
    () => setCurrentWeekStart((w) => addWeeks(w, 1)),
    [],
  )

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('time.title')}</h1>
        <div className="flex items-center gap-2">
          {hasDraftLogs && (
            <Button
              variant="outline"
              onClick={() => {
                if (!profile) return
                submitWeek.mutate({
                  janitorId: profile.id,
                  weekStart: weekStartStr,
                  weekEnd: weekEndStr,
                })
              }}
              disabled={submitWeek.isPending}
              className="gap-1.5"
            >
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">{t('time.submitWeek')}</span>
            </Button>
          )}
          <Button
            size="lg"
            onClick={() => setShowManualEntry(true)}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t('time.addManual')}</span>
          </Button>
        </div>
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={goToPrevWeek}
          aria-label="Previous week"
          className="min-h-[44px] min-w-[44px]"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">
            {t('time.weekOf', { week: weekNumber })}
          </p>
          <p className="text-xs capitalize text-muted-foreground">
            {weekLabel}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={goToNextWeek}
          aria-label="Next week"
          className="min-h-[44px] min-w-[44px]"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {isLoading ? (
        <WeeklySkeleton />
      ) : (
        <>
          {/* Weekly summary card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {t('time.thisWeek')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-foreground">
                  {totalHours.toFixed(1)}t
                </span>
                {budgetedHours > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {t('time.budgetedHours')}: {budgetedHours}t
                  </span>
                )}
              </div>
              {budgetedHours > 0 ? (
                <>
                  {/* Progress bar */}
                  <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-300',
                        progressPct >= 100
                          ? 'bg-coor-green-500'
                          : progressPct >= 75
                            ? 'bg-coor-blue-500'
                            : 'bg-coor-orange-500',
                      )}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-right text-xs text-muted-foreground">
                    {progressPct.toFixed(0)}%
                  </p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">{t('time.noBudgetedHours')}</p>
              )}
            </CardContent>
          </Card>

          {/* Day-by-day breakdown */}
          <div className="space-y-2">
            {daysOfWeek.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd')
              const logs = logsByDate.get(dateKey) ?? []
              return (
                <DayRow key={dateKey} date={day} logs={logs} t={t} />
              )
            })}
          </div>

          {/* Empty state */}
          {totalMinutes === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t('time.noLogs')}
            </p>
          )}
        </>
      )}

      {/* Manual entry dialog */}
      <ManualEntryDialog
        open={showManualEntry}
        onOpenChange={setShowManualEntry}
        t={t}
      />
    </div>
  )
}
