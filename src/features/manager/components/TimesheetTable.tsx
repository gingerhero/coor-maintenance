import { useTranslation } from 'react-i18next'
import { format, parseISO } from 'date-fns'
import { nb } from 'date-fns/locale'
import { Check, Undo2, Clock, User, Building2, Calendar } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { minutesToDisplay } from '@/lib/time-utils'
import type { TimeLogWithRelations } from '@/features/manager/hooks/useManagerTimesheets'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusVariant(
  status: string,
): 'secondary' | 'warning' | 'success' {
  switch (status) {
    case 'draft':
      return 'secondary'
    case 'submitted':
      return 'warning'
    case 'approved':
      return 'success'
    default:
      return 'secondary'
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TimesheetTableProps {
  logs: TimeLogWithRelations[] | undefined
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onSelectAll: () => void
  onApprove: (id: string) => void
  onReject: (id: string) => void
  isPending: boolean
  isLoading: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TimesheetTable({
  logs,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onApprove,
  onReject,
  isPending,
  isLoading,
}: TimesheetTableProps) {
  const { t } = useTranslation('manager')

  // Only submitted logs can be selected for bulk approve
  const submittedLogs = logs?.filter((l) => l.status === 'submitted') ?? []
  const allSubmittedSelected =
    submittedLogs.length > 0 &&
    submittedLogs.every((l) => selectedIds.has(l.id))

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (!logs || logs.length === 0) {
    return (
      <EmptyState
        icon={<Clock />}
        title={t('timesheets.noLogs')}
        description={t('timesheets.noLogsDescription')}
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
                <th className="w-10 px-4 py-3">
                  <Checkbox
                    checked={allSubmittedSelected}
                    onCheckedChange={() => onSelectAll()}
                    aria-label="Select all"
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  {t('timesheets.columns.date')}
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  {t('timesheets.columns.janitor')}
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  {t('timesheets.columns.property')}
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  {t('timesheets.columns.hours')}
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  {t('timesheets.columns.status')}
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  {t('timesheets.columns.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className="transition-colors hover:bg-muted/50"
                >
                  <td className="px-4 py-3">
                    {log.status === 'submitted' ? (
                      <Checkbox
                        checked={selectedIds.has(log.id)}
                        onCheckedChange={() => onToggleSelect(log.id)}
                        aria-label={`Select ${log.janitor.full_name}`}
                      />
                    ) : (
                      <div className="h-6 w-6" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {format(parseISO(log.date), 'd. MMM yyyy', { locale: nb })}
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {log.janitor.full_name}
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {log.property.name}
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {minutesToDisplay(log.actual_minutes)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant(log.status)}>
                      {t(`timesheets.status.${log.status}`)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {log.status === 'submitted' && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => onApprove(log.id)}
                          disabled={isPending}
                          className="gap-1"
                        >
                          <Check className="h-3.5 w-3.5" />
                          {t('timesheets.approve')}
                        </Button>
                      )}
                      {log.status === 'approved' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onReject(log.id)}
                          disabled={isPending}
                          className="gap-1"
                        >
                          <Undo2 className="h-3.5 w-3.5" />
                          {t('timesheets.reject')}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile card layout */}
      <div className="space-y-3 sm:hidden">
        {logs.map((log) => (
          <div
            key={log.id}
            className="rounded-lg border border-border p-4"
          >
            <div className="flex items-center justify-between">
              <Badge variant={statusVariant(log.status)}>
                {t(`timesheets.status.${log.status}`)}
              </Badge>
              <span className="text-sm font-semibold text-foreground">
                {minutesToDisplay(log.actual_minutes)}
              </span>
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-1.5 text-sm text-foreground">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                {log.janitor.full_name}
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                {log.property.name}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {format(parseISO(log.date), 'd. MMM yyyy', { locale: nb })}
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              {log.status === 'submitted' && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onApprove(log.id)}
                  disabled={isPending}
                  className="gap-1"
                >
                  <Check className="h-3.5 w-3.5" />
                  {t('timesheets.approve')}
                </Button>
              )}
              {log.status === 'approved' && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onReject(log.id)}
                  disabled={isPending}
                  className="gap-1"
                >
                  <Undo2 className="h-3.5 w-3.5" />
                  {t('timesheets.reject')}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
