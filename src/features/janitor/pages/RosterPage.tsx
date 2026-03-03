import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { format, parseISO } from 'date-fns'
import { nb } from 'date-fns/locale'
import { Plus, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { useMyCurrentRoster } from '@/features/janitor/hooks/useMyRoster'
import { useMyAbsenceReports } from '@/features/janitor/hooks/useAbsenceReport'
import { AbsenceReportForm } from '@/features/janitor/components/AbsenceReportForm'

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

function absenceStatusVariant(status: string) {
  switch (status) {
    case 'pending':
      return 'warning' as const
    case 'approved':
      return 'success' as const
    case 'rejected':
      return 'destructive' as const
    default:
      return 'secondary' as const
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function JanitorRosterPage() {
  const { t } = useTranslation('janitor')
  const [dialogOpen, setDialogOpen] = useState(false)

  const { data: rosterEntries, isLoading: rosterLoading } = useMyCurrentRoster()
  const { data: absenceReports, isLoading: reportsLoading } = useMyAbsenceReports()

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('roster.title')}</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('absence.title')}
        </Button>
      </div>

      {/* My schedule */}
      {rosterLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : !rosterEntries || rosterEntries.length === 0 ? (
        <EmptyState title={t('roster.noEntries')} />
      ) : (
        <div className="space-y-3">
          {rosterEntries.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{entry.property.name}</h3>
                  <span className="text-sm text-muted-foreground">
                    {entry.budgeted_weekly_hours} {t('time.hours').toLowerCase()}/{t('time.thisWeek').toLowerCase().split(' ')[0]}
                  </span>
                </div>
                <div className="mt-2 flex gap-1">
                  {DAYS.map((day) => {
                    const isActive =
                      (entry.schedule as Record<string, boolean>)?.[day.key] === true
                    return (
                      <span
                        key={day.key}
                        className={`flex h-7 w-7 items-center justify-center rounded text-xs font-medium ${
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {day.label}
                      </span>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Absence reports */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">{t('absence.myReports')}</h2>

        {reportsLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : !absenceReports || absenceReports.length === 0 ? (
          <EmptyState title={t('absence.noReports')} />
        ) : (
          <div className="space-y-3">
            {absenceReports.map((report) => (
              <Card key={report.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <Badge variant={absenceStatusVariant(report.status)}>
                      {t(`absence.status.${report.status}`)}
                    </Badge>
                    <Badge variant={report.absence_type === 'sick' ? 'destructive' : 'secondary'}>
                      {t(`absence.${report.absence_type ?? 'other'}`)}
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {format(parseISO(report.date_from), 'd. MMM', { locale: nb })}
                      {' – '}
                      {format(parseISO(report.date_to), 'd. MMM yyyy', { locale: nb })}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{report.reason}</p>
                  {report.to_janitor && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t('absence.replacement')}: {report.to_janitor.full_name}
                    </p>
                  )}
                  {report.decision_note && (
                    <p className="mt-1 text-xs italic text-muted-foreground">
                      {report.decision_note}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Absence report dialog */}
      <AbsenceReportForm open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
