import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { format, parseISO } from 'date-fns'
import { nb } from 'date-fns/locale'
import { Download } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useProperties } from '@/features/properties/hooks/useProperties'
import { useCustomerAvvik } from '../hooks/useCustomerData'

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function CustomerReportsPage() {
  const { t } = useTranslation('customer')
  const { t: tc } = useTranslation('common')
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | undefined>()

  const { data: properties } = useProperties()
  const { data: avvik, isLoading } = useCustomerAvvik(selectedPropertyId)

  // Summary stats
  const summary = useMemo(() => {
    if (!avvik?.length) return null
    const total = avvik.length
    const open = avvik.filter((a) => a.status !== 'resolved').length
    const resolved = avvik.filter((a) => a.status === 'resolved').length
    const low = avvik.filter((a) => a.severity === 'low').length
    const medium = avvik.filter((a) => a.severity === 'medium').length
    const high = avvik.filter((a) => a.severity === 'high').length
    return { total, open, resolved, low, medium, high }
  }, [avvik])

  // Monthly breakdown
  const monthlyData = useMemo(() => {
    if (!avvik?.length) return []
    const map = new Map<string, { month: string; total: number; resolved: number }>()

    for (const a of avvik) {
      const monthKey = format(parseISO(a.created_at), 'yyyy-MM')
      const monthLabel = format(parseISO(a.created_at), 'MMM yyyy', { locale: nb })
      if (!map.has(monthKey)) {
        map.set(monthKey, { month: monthLabel, total: 0, resolved: 0 })
      }
      const entry = map.get(monthKey)!
      entry.total++
      if (a.status === 'resolved') entry.resolved++
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([, data]) => data)
  }, [avvik])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('reports.title')}</h1>
        <Button variant="outline" disabled className="gap-1.5">
          <Download className="h-4 w-4" />
          {t('reports.downloadPdf')}
        </Button>
      </div>

      {/* Property filter */}
      <Select
        value={selectedPropertyId ?? 'all'}
        onValueChange={(v) => setSelectedPropertyId(v === 'all' ? undefined : v)}
      >
        <SelectTrigger className="max-w-xs">
          <SelectValue placeholder={t('reports.selectProperty')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('reports.selectProperty')}</SelectItem>
          {properties?.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-12" />
            </Card>
          ))}
        </div>
      ) : !summary ? (
        <EmptyState title={t('reports.noData')} />
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <SummaryCard label={t('reports.total')} value={summary.total} />
            <SummaryCard label={t('reports.open')} value={summary.open} />
            <SummaryCard label={t('reports.resolved')} value={summary.resolved} />
            <SummaryCard
              label={tc('severity.low')}
              value={summary.low}
              badge="secondary"
            />
            <SummaryCard
              label={tc('severity.medium')}
              value={summary.medium}
              badge="warning"
            />
            <SummaryCard
              label={tc('severity.high')}
              value={summary.high}
              badge="destructive"
            />
          </div>

          {/* Monthly breakdown */}
          <div>
            <h2 className="mb-3 text-lg font-semibold">{t('reports.monthlySummary')}</h2>
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="px-4 py-3 font-medium">{t('reports.month')}</th>
                      <th className="px-4 py-3 font-medium text-right">{t('reports.total')}</th>
                      <th className="px-4 py-3 font-medium text-right">{t('reports.resolved')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyData.map((row) => (
                      <tr key={row.month} className="border-b last:border-0">
                        <td className="px-4 py-3 capitalize">{row.month}</td>
                        <td className="px-4 py-3 text-right">{row.total}</td>
                        <td className="px-4 py-3 text-right">{row.resolved}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Summary card
// ---------------------------------------------------------------------------

function SummaryCard({
  label,
  value,
  badge,
}: {
  label: string
  value: number
  badge?: 'secondary' | 'warning' | 'destructive'
}) {
  return (
    <Card className="p-4">
      <p className="text-sm text-muted-foreground">
        {badge ? (
          <Badge variant={badge} className="text-xs">
            {label}
          </Badge>
        ) : (
          label
        )}
      </p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </Card>
  )
}
