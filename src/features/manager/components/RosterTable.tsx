import { useTranslation } from 'react-i18next'
import { format, parseISO, isBefore, startOfDay } from 'date-fns'
import { nb } from 'date-fns/locale'
import { Pencil, Calendar, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import type { RosterEntryWithJanitor } from '@/features/manager/hooks/useRoster'

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
// Helpers
// ---------------------------------------------------------------------------

function getEntryStatus(activeTo: string | null) {
  if (activeTo == null) return 'active' as const
  const endDate = parseISO(activeTo)
  const today = startOfDay(new Date())
  if (isBefore(endDate, today)) return 'ended' as const
  return 'endingSoon' as const
}

function statusBadgeVariant(status: 'active' | 'ended' | 'endingSoon') {
  switch (status) {
    case 'active':
      return 'success' as const
    case 'ended':
      return 'secondary' as const
    case 'endingSoon':
      return 'warning' as const
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RosterTableProps {
  entries: RosterEntryWithJanitor[]
  onEditEntry: (entry: RosterEntryWithJanitor) => void
  isLoading: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RosterTable({
  entries,
  onEditEntry,
  isLoading,
}: RosterTableProps) {
  const { t } = useTranslation('manager')

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (!entries || entries.length === 0) {
    return (
      <EmptyState
        title={t('roster.noEntries')}
        description={t('roster.noEntriesDescription')}
      />
    )
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden sm:block">
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  {t('roster.columns.janitor')}
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  {t('roster.columns.days')}
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  {t('roster.columns.hoursPerWeek')}
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  {t('roster.columns.activeFrom')}
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  {t('roster.columns.activeTo')}
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  {t('roster.columns.status')}
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  {t('roster.columns.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entries.map((entry) => {
                const status = getEntryStatus(entry.active_to)
                return (
                  <tr key={entry.id} className="transition-colors hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium">
                      {entry.janitor.full_name}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {DAYS.map((day) => {
                          const isActive = entry.schedule?.[day.key] === true
                          return (
                            <span
                              key={day.key}
                              className={
                                isActive
                                  ? 'text-xs font-bold text-foreground'
                                  : 'text-xs text-muted-foreground/40'
                              }
                            >
                              {day.label}
                            </span>
                          )
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {entry.budgeted_weekly_hours ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {format(parseISO(entry.active_from), 'd. MMM yyyy', {
                        locale: nb,
                      })}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {entry.active_to
                        ? format(parseISO(entry.active_to), 'd. MMM yyyy', {
                            locale: nb,
                          })
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusBadgeVariant(status)}>
                        {t(`roster.entryStatus.${status}`)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEditEntry(entry)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 sm:hidden">
        {entries.map((entry) => {
          const status = getEntryStatus(entry.active_to)
          return (
            <div
              key={entry.id}
              className="cursor-pointer rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
              onClick={() => onEditEntry(entry)}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">
                  {entry.janitor.full_name}
                </h3>
                <Badge variant={statusBadgeVariant(status)}>
                  {t(`roster.entryStatus.${status}`)}
                </Badge>
              </div>

              <div className="mt-2 flex gap-1">
                {DAYS.map((day) => {
                  const isActive = entry.schedule?.[day.key] === true
                  return (
                    <span
                      key={day.key}
                      className={
                        isActive
                          ? 'text-xs font-bold text-foreground'
                          : 'text-xs text-muted-foreground/40'
                      }
                    >
                      {day.label}
                    </span>
                  )
                })}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {entry.budgeted_weekly_hours ?? '—'} {t('roster.columns.hoursPerWeek')}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(parseISO(entry.active_from), 'd. MMM yyyy', {
                    locale: nb,
                  })}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
