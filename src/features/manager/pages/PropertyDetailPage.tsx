import { useTranslation } from 'react-i18next'
import { useParams, useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { nb } from 'date-fns/locale'
import {
  ArrowLeft,
  MapPin,
  Users,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { useProperty } from '@/features/properties/hooks/useProperties'
import { useAvvikForProperty, useUpdateAvvikStatus } from '@/features/avvik/hooks/useAvvik'
import { useAuthStore } from '@/stores/authStore'
import {
  usePropertyVisits,
  usePropertyTimeSummary,
  usePropertyStats,
} from '../hooks/usePropertyDetail'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Separator } from '@/components/ui/separator'
import { PropertyStatCards } from '../components/PropertyStatCards'
import { AvvikTimeline } from '../components/AvvikTimeline'
import type { AvvikStatus, AssignmentStatus } from '@/types/database'

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

function statusVariant(status: AssignmentStatus) {
  switch (status) {
    case 'completed':
      return 'success' as const
    case 'in_progress':
      return 'warning' as const
    case 'cancelled':
      return 'destructive' as const
    case 'scheduled':
    default:
      return 'secondary' as const
  }
}

function statusLabel(status: AssignmentStatus): string {
  switch (status) {
    case 'completed':
      return 'Fullfort'
    case 'in_progress':
      return 'Pagar'
    case 'cancelled':
      return 'Avlyst'
    case 'scheduled':
      return 'Planlagt'
    default:
      return status
  }
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function PropertyDetailSkeleton() {
  return (
    <div>
      <Skeleton className="mb-2 h-5 w-40" />
      <Skeleton className="mb-1 h-8 w-64" />
      <Skeleton className="mb-6 h-4 w-48" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Overview tab
// ---------------------------------------------------------------------------

function OverviewTab({
  propertyId,
  estimatedWeeklyHours,
}: {
  propertyId: string
  estimatedWeeklyHours: number | null
}) {
  const { t } = useTranslation('manager')
  const { data: stats, isLoading: statsLoading } = usePropertyStats(propertyId)
  const { data: visits, isLoading: visitsLoading } = usePropertyVisits(propertyId)

  const recentVisits = visits?.slice(0, 5) ?? []

  return (
    <div className="space-y-6">
      <PropertyStatCards
        stats={stats}
        loading={statsLoading}
        estimatedWeeklyHours={estimatedWeeklyHours}
      />

      {/* Assigned janitors from recent visits */}
      {visits && visits.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Users className="h-4 w-4 text-muted-foreground" />
            {t('property.assignedJanitors')}
          </h3>
          <div className="flex flex-wrap gap-2">
            {(() => {
              const janitorMap = new Map<string, string>()
              for (const visit of visits) {
                for (const aj of visit.assignment_janitors ?? []) {
                  if (aj.janitor && !janitorMap.has(aj.janitor.id)) {
                    janitorMap.set(aj.janitor.id, aj.janitor.full_name)
                  }
                }
              }
              if (janitorMap.size === 0) {
                return (
                  <p className="text-sm text-muted-foreground">
                    {t('property.noJanitors')}
                  </p>
                )
              }
              return Array.from(janitorMap.entries()).map(([id, name]) => (
                <Badge key={id} variant="outline">
                  {name}
                </Badge>
              ))
            })()}
          </div>
        </div>
      )}

      {/* Recent visits */}
      <div>
        <h3 className="mb-3 text-sm font-semibold">
          {t('property.recentVisits')}
        </h3>
        {visitsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : recentVisits.length === 0 ? (
          <EmptyState
            icon={<Calendar />}
            title={t('property.noVisits')}
            description={t('property.noVisitsDescription')}
          />
        ) : (
          <div className="space-y-2">
            {recentVisits.map((visit) => {
              const dateFormatted = format(
                parseISO(visit.scheduled_date),
                'd. MMM yyyy',
                { locale: nb },
              )
              const janitorNames =
                visit.assignment_janitors
                  ?.map((aj) => aj.janitor?.full_name)
                  .filter(Boolean)
                  .join(', ') || '-'
              const taskCount = visit.task_executions?.[0]?.count ?? 0
              const avvikCount = visit.avvik?.[0]?.count ?? 0

              return (
                <Card key={visit.id}>
                  <CardContent className="flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="font-medium">{dateFormatted}</span>
                        <Badge variant={statusVariant(visit.status)} className="text-[10px]">
                          {statusLabel(visit.status)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{janitorNames}</span>
                        {taskCount > 0 && (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            {taskCount}
                          </span>
                        )}
                        {visit.actual_minutes != null && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(visit.actual_minutes)}
                          </span>
                        )}
                      </div>
                    </div>
                    {avvikCount > 0 && (
                      <Badge variant="warning" className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {avvikCount}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Avvik tab
// ---------------------------------------------------------------------------

function AvvikTab({ propertyId }: { propertyId: string }) {
  const { t } = useTranslation('manager')
  const { data: avvik, isLoading } = useAvvikForProperty(propertyId)
  const updateStatus = useUpdateAvvikStatus()
  const userId = useAuthStore((s) => s.profile?.id)

  const handleStatusChange = (id: string, status: AvvikStatus) => {
    updateStatus.mutate({
      id,
      status,
      resolved_by: status === 'resolved' ? userId : undefined,
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    )
  }

  if (!avvik || avvik.length === 0) {
    return (
      <EmptyState
        icon={<AlertTriangle />}
        title={t('property.noAvvik')}
        description={t('property.noAvvikDescription')}
      />
    )
  }

  return <AvvikTimeline avvik={avvik} onStatusChange={handleStatusChange} />
}

// ---------------------------------------------------------------------------
// Visits tab
// ---------------------------------------------------------------------------

function VisitsTab({ propertyId }: { propertyId: string }) {
  const { t } = useTranslation('manager')
  const { data: visits, isLoading } = usePropertyVisits(propertyId)

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-lg" />
        ))}
      </div>
    )
  }

  if (!visits || visits.length === 0) {
    return (
      <EmptyState
        icon={<Calendar />}
        title={t('property.noVisits')}
        description={t('property.noVisitsDescription')}
      />
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      {/* Table header - hidden on mobile */}
      <div className="hidden grid-cols-[1fr_1fr_80px_80px_100px] gap-4 border-b border-border bg-muted/50 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid">
        <span>{t('property.visitDate')}</span>
        <span>{t('property.visitJanitor')}</span>
        <span>{t('property.visitTasks')}</span>
        <span>{t('property.visitDuration')}</span>
        <span>{t('property.visitStatus')}</span>
      </div>

      {visits.map((visit) => {
        const dateFormatted = format(
          parseISO(visit.scheduled_date),
          'd. MMM yyyy',
          { locale: nb },
        )
        const janitorNames =
          visit.assignment_janitors
            ?.map((aj) => aj.janitor?.full_name)
            .filter(Boolean)
            .join(', ') || '-'
        const taskCount = visit.task_executions?.[0]?.count ?? 0

        return (
          <div key={visit.id}>
            {/* Desktop row */}
            <div className="hidden grid-cols-[1fr_1fr_80px_80px_100px] gap-4 border-b border-border px-4 py-3 last:border-b-0 md:grid">
              <span className="text-sm">{dateFormatted}</span>
              <span className="truncate text-sm text-muted-foreground">
                {janitorNames}
              </span>
              <span className="text-sm text-muted-foreground">{taskCount}</span>
              <span className="text-sm text-muted-foreground">
                {formatDuration(visit.actual_minutes)}
              </span>
              <Badge variant={statusVariant(visit.status)} className="w-fit text-[10px]">
                {statusLabel(visit.status)}
              </Badge>
            </div>

            {/* Mobile card */}
            <div className="border-b border-border p-3 last:border-b-0 md:hidden">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{dateFormatted}</span>
                <Badge variant={statusVariant(visit.status)} className="text-[10px]">
                  {statusLabel(visit.status)}
                </Badge>
              </div>
              <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                <span>{janitorNames}</span>
                <span>{taskCount} oppg.</span>
                <span>{formatDuration(visit.actual_minutes)}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Time tab
// ---------------------------------------------------------------------------

function TimeTab({ propertyId }: { propertyId: string }) {
  const { t } = useTranslation('manager')
  const { data: timeLogs, isLoading } = usePropertyTimeSummary(propertyId)

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-lg" />
        ))}
      </div>
    )
  }

  if (!timeLogs || timeLogs.length === 0) {
    return (
      <EmptyState
        icon={<Clock />}
        title={t('property.noTimeLogs')}
        description={t('property.noTimeLogsDescription')}
      />
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="hidden grid-cols-[1fr_1fr_100px] gap-4 border-b border-border bg-muted/50 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid">
        <span>{t('property.visitDate')}</span>
        <span>{t('property.visitJanitor')}</span>
        <span>{t('property.hoursWorked')}</span>
      </div>

      {timeLogs.map((log) => {
        const dateFormatted = format(parseISO(log.date), 'd. MMM yyyy', {
          locale: nb,
        })
        const janitorName = log.janitor?.full_name ?? '-'
        const hours = Math.round((log.actual_minutes / 60) * 10) / 10

        return (
          <div
            key={log.id}
            className="border-b border-border px-4 py-3 last:border-b-0"
          >
            {/* Desktop */}
            <div className="hidden grid-cols-[1fr_1fr_100px] gap-4 md:grid">
              <span className="text-sm">{dateFormatted}</span>
              <span className="text-sm text-muted-foreground">
                {janitorName}
              </span>
              <span className="text-sm font-medium">{hours}t</span>
            </div>

            {/* Mobile */}
            <div className="flex items-center justify-between gap-2 md:hidden">
              <div>
                <span className="text-sm font-medium">{dateFormatted}</span>
                <p className="text-xs text-muted-foreground">{janitorName}</p>
              </div>
              <span className="text-sm font-semibold">{hours}t</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function PropertyDetailPage() {
  const { t } = useTranslation('manager')
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: property, isLoading } = useProperty(id)

  if (isLoading) {
    return (
      <div>
        <PropertyDetailSkeleton />
      </div>
    )
  }

  if (!property) {
    return (
      <div>
        <button
          type="button"
          className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          onClick={() => navigate('/manager/properties')}
        >
          <ArrowLeft className="h-4 w-4" />
          {t('property.backToProperties')}
        </button>
        <EmptyState title={t('dashboard.noProperties')} />
      </div>
    )
  }

  return (
    <div>
      {/* Back button */}
      <button
        type="button"
        className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        onClick={() => navigate('/manager/properties')}
      >
        <ArrowLeft className="h-4 w-4" />
        {t('property.backToProperties')}
      </button>

      {/* Header */}
      <h1 className="text-2xl font-bold">{property.name}</h1>
      <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
        <MapPin className="h-4 w-4" />
        <span>{property.address}</span>
      </div>

      <Separator className="my-4" />

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">{t('property.overview')}</TabsTrigger>
          <TabsTrigger value="avvik">{t('property.avvik')}</TabsTrigger>
          <TabsTrigger value="visits">{t('property.history')}</TabsTrigger>
          <TabsTrigger value="time">{t('property.timeLog')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab
            propertyId={property.id}
            estimatedWeeklyHours={property.estimated_weekly_hours}
          />
        </TabsContent>

        <TabsContent value="avvik" className="mt-4">
          <AvvikTab propertyId={property.id} />
        </TabsContent>

        <TabsContent value="visits" className="mt-4">
          <VisitsTab propertyId={property.id} />
        </TabsContent>

        <TabsContent value="time" className="mt-4">
          <TimeTab propertyId={property.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
