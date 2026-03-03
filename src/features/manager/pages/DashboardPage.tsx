import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  Users,
} from 'lucide-react'
import { format } from 'date-fns'
import { nb } from 'date-fns/locale'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

import { KPICard } from '../components/KPICard'
import { useManagerKPIs } from '../hooks/useManagerDashboard'
import { useManagerPropertyList } from '../hooks/useManagerProperties'
import type { PropertyWithStats } from '../hooks/useManagerProperties'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DateRange = '7d' | '30d' | '90d'

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function ManagerDashboardPage() {
  const { t } = useTranslation('manager')
  const navigate = useNavigate()
  const [dateRange, setDateRange] = useState<DateRange>('30d')

  const { data: kpis, isLoading: kpisLoading } = useManagerKPIs(dateRange)
  const { data: properties, isLoading: propsLoading } =
    useManagerPropertyList()

  return (
    <div>
      {/* Header with date-range selector */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>
        <DateRangeSelector value={dateRange} onChange={setDateRange} />
      </div>

      {/* KPI row */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label={t('dashboard.completionRate')}
          value={kpis?.completionRate ?? '\u2014'}
          subLabel="%"
          loading={kpisLoading}
        />
        <KPICard
          icon={<Clock className="h-5 w-5" />}
          label={t('dashboard.hoursUsed')}
          value={kpis?.hoursUsed ?? '\u2014'}
          subLabel={`/ ${kpis?.hoursBudgeted ?? '\u2014'} ${t('dashboard.hoursBudgeted')}`}
          loading={kpisLoading}
        />
        <KPICard
          icon={<AlertTriangle className="h-5 w-5" />}
          label={t('dashboard.openAvvik')}
          value={kpis?.openAvvikCount ?? 0}
          loading={kpisLoading}
        />
        <KPICard
          icon={<Users className="h-5 w-5" />}
          label={t('dashboard.staffingGaps')}
          value={kpis?.staffingGaps ?? 0}
          loading={kpisLoading}
        />
      </div>

      {/* Property list */}
      <h2 className="mb-3 text-lg font-semibold">
        {t('dashboard.properties')}
      </h2>

      {propsLoading ? (
        <PropertyListSkeleton />
      ) : !properties?.length ? (
        <EmptyState
          title={t('dashboard.noProperties')}
          description={t('dashboard.noPropertiesDescription')}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              onClick={() => navigate(`/manager/properties/${property.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Date-range selector
// ---------------------------------------------------------------------------

function DateRangeSelector({
  value,
  onChange,
}: {
  value: DateRange
  onChange: (v: DateRange) => void
}) {
  const { t } = useTranslation('manager')
  const options: Array<{ key: DateRange; label: string }> = [
    { key: '7d', label: t('dashboard.last7days') },
    { key: '30d', label: t('dashboard.last30days') },
    { key: '90d', label: t('dashboard.last90days') },
  ]

  return (
    <div className="flex gap-1 rounded-lg border border-border bg-muted p-1">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onChange(opt.key)}
          className={cn(
            'rounded-md px-3 py-1 text-sm font-medium transition-colors',
            value === opt.key
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Property card
// ---------------------------------------------------------------------------

function PropertyCard({
  property,
  onClick,
}: {
  property: PropertyWithStats
  onClick: () => void
}) {
  const { t } = useTranslation('manager')

  const completionPct =
    property.totalVisits > 0
      ? Math.round((property.completedVisits / property.totalVisits) * 100)
      : null

  return (
    <Card
      className="cursor-pointer p-4 transition-shadow hover:shadow-md"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">{property.name}</p>
          <p className="flex items-center gap-1 truncate text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {property.address}
          </p>
        </div>
        {property.openAvvikCount > 0 && (
          <Badge variant="destructive" className="shrink-0">
            {property.openAvvikCount} {t('property.avvik').toLowerCase()}
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {/* Last visit */}
        <span>
          {property.lastVisitDate
            ? `${t('dashboard.lastVisit')}: ${format(new Date(property.lastVisitDate), 'd. MMM', { locale: nb })}`
            : t('dashboard.noVisits')}
        </span>

        {/* Completion rate */}
        {completionPct !== null && (
          <span>
            {completionPct}% ({property.completedVisits}/{property.totalVisits}{' '}
            {t('dashboard.visits')})
          </span>
        )}
      </div>

      {/* Assigned janitors */}
      {property.assignedJanitors.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {property.assignedJanitors.map((janitor) => (
            <Badge key={janitor.id} variant="secondary" className="text-xs">
              {janitor.full_name}
            </Badge>
          ))}
        </div>
      )}
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Skeleton for property list
// ---------------------------------------------------------------------------

function PropertyListSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="p-4">
          <Skeleton className="mb-2 h-5 w-3/4" />
          <Skeleton className="mb-3 h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </Card>
      ))}
    </div>
  )
}
