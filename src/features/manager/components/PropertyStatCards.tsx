import { useTranslation } from 'react-i18next'
import {
  CalendarCheck,
  Clock,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import type { PropertyStats } from '../hooks/usePropertyDetail'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PropertyStatCardsProps {
  stats: PropertyStats | undefined
  loading?: boolean
  estimatedWeeklyHours?: number | null
}

// ---------------------------------------------------------------------------
// Single stat card
// ---------------------------------------------------------------------------

function StatCard({
  icon,
  label,
  value,
  subtitle,
  highlight,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  subtitle?: string
  highlight?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card p-4',
        highlight && 'border-destructive/30 bg-destructive/5',
      )}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      {subtitle && (
        <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function StatCardsSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-2 h-7 w-16" />
          <Skeleton className="mt-1 h-3 w-20" />
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PropertyStatCards({
  stats,
  loading,
  estimatedWeeklyHours,
}: PropertyStatCardsProps) {
  const { t } = useTranslation('manager')

  if (loading || !stats) {
    return <StatCardsSkeleton />
  }

  const hoursSubtitle =
    estimatedWeeklyHours != null
      ? `${estimatedWeeklyHours}t/uke ${t('dashboard.ofBudget')}`
      : undefined

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        icon={<CalendarCheck className="h-4 w-4" />}
        label={t('property.totalVisits')}
        value={stats.totalVisits}
      />
      <StatCard
        icon={<TrendingUp className="h-4 w-4" />}
        label={t('property.completionRate')}
        value={`${stats.completionRate}%`}
      />
      <StatCard
        icon={<Clock className="h-4 w-4" />}
        label={t('property.totalHours')}
        value={stats.totalHours}
        subtitle={hoursSubtitle}
      />
      <StatCard
        icon={<AlertTriangle className="h-4 w-4" />}
        label={t('dashboard.openAvvik')}
        value={stats.openAvvikCount}
        highlight={stats.openAvvikCount > 0}
      />
    </div>
  )
}
