import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { format, parseISO } from 'date-fns'
import { nb } from 'date-fns/locale'
import { Image } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useProperties } from '@/features/properties/hooks/useProperties'
import { getPhotoUrl } from '@/lib/storage'
import {
  useCompletionByNS3451,
  useProfitabilityReport,
  useAvvikSummary,
  usePhotoGallery,
  type CompletionByCode,
  type ProfitabilityRow,
  type PhotoItem,
} from '../hooks/useManagerReports'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DateRange = '7d' | '30d' | '90d'

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function ReportsPage() {
  const { t } = useTranslation('manager')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('reports.title')}</h1>

      <Tabs defaultValue="completion">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="completion">{t('reports.completion')}</TabsTrigger>
          <TabsTrigger value="profitability">{t('reports.profitability')}</TabsTrigger>
          <TabsTrigger value="avvik">{t('reports.avvikHeatmap')}</TabsTrigger>
          <TabsTrigger value="photos">{t('reports.photoGallery')}</TabsTrigger>
        </TabsList>

        <TabsContent value="completion" className="mt-4">
          <CompletionTab />
        </TabsContent>
        <TabsContent value="profitability" className="mt-4">
          <ProfitabilityTab />
        </TabsContent>
        <TabsContent value="avvik" className="mt-4">
          <AvvikTab />
        </TabsContent>
        <TabsContent value="photos" className="mt-4">
          <PhotoGalleryTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Date range selector (reused pattern from DashboardPage)
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
// Tab 1: Completion by NS 3451
// ---------------------------------------------------------------------------

function CompletionTab() {
  const { t } = useTranslation('manager')
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | undefined>()
  const { data: properties } = useProperties()
  const { data: completionData, isLoading } = useCompletionByNS3451(selectedPropertyId)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
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
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} cols={4} />
      ) : !completionData?.length ? (
        <EmptyState title={t('reports.noData')} />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">{t('reports.nsCode')}</th>
                  <th className="px-4 py-3 font-medium">{t('reports.description')}</th>
                  <th className="px-4 py-3 font-medium text-right">{t('reports.completionRate')}</th>
                  <th className="px-4 py-3 font-medium w-40"></th>
                </tr>
              </thead>
              <tbody>
                {completionData.map((row) => (
                  <CompletionRow key={row.nsCode} row={row} />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

function CompletionRow({ row }: { row: CompletionByCode }) {
  return (
    <tr className="border-b last:border-0">
      <td className="px-4 py-3 font-mono text-xs">{row.nsCode}</td>
      <td className="px-4 py-3 max-w-xs truncate">{row.description}</td>
      <td className="px-4 py-3 text-right font-medium">
        <span
          className={cn(
            row.rate >= 80
              ? 'text-green-600'
              : row.rate >= 50
                ? 'text-orange-500'
                : 'text-red-500',
          )}
        >
          {row.rate}%
        </span>
        <span className="ml-1 text-xs text-muted-foreground">
          ({row.completed}/{row.total})
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              row.rate >= 80
                ? 'bg-green-500'
                : row.rate >= 50
                  ? 'bg-orange-500'
                  : 'bg-red-500',
            )}
            style={{ width: `${row.rate}%` }}
          />
        </div>
      </td>
    </tr>
  )
}

// ---------------------------------------------------------------------------
// Tab 2: Profitability
// ---------------------------------------------------------------------------

function ProfitabilityTab() {
  const { t } = useTranslation('manager')
  const [dateRange, setDateRange] = useState<DateRange>('30d')
  const { data: rows, isLoading } = useProfitabilityReport(dateRange)

  const totals = useMemo(() => {
    if (!rows?.length) return null
    const budgeted = rows.reduce((sum, r) => sum + r.budgetedHours, 0)
    const actual = rows.reduce((sum, r) => sum + r.actualHours, 0)
    return {
      budgeted: Math.round(budgeted * 10) / 10,
      actual: Math.round(actual * 10) / 10,
      delta: Math.round((budgeted - actual) * 10) / 10,
      efficiency: budgeted > 0 ? Math.round((actual / budgeted) * 100) : 0,
    }
  }, [rows])

  return (
    <div className="space-y-4">
      <DateRangeSelector value={dateRange} onChange={setDateRange} />

      {isLoading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : !rows?.length ? (
        <EmptyState title={t('reports.noData')} />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">{t('reports.property')}</th>
                  <th className="px-4 py-3 font-medium text-right">{t('reports.budgetedHours')}</th>
                  <th className="px-4 py-3 font-medium text-right">{t('reports.actualHours')}</th>
                  <th className="px-4 py-3 font-medium text-right">{t('reports.delta')}</th>
                  <th className="px-4 py-3 font-medium text-right">{t('reports.efficiency')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <ProfitabilityRow key={row.propertyId} row={row} />
                ))}
                {totals && (
                  <tr className="border-t-2 font-semibold">
                    <td className="px-4 py-3">{t('reports.total')}</td>
                    <td className="px-4 py-3 text-right">{totals.budgeted}t</td>
                    <td className="px-4 py-3 text-right">{totals.actual}t</td>
                    <td className={cn(
                      'px-4 py-3 text-right',
                      totals.delta >= 0 ? 'text-green-600' : 'text-red-500',
                    )}>
                      {totals.delta >= 0 ? '+' : ''}{totals.delta}t
                    </td>
                    <td className="px-4 py-3 text-right">{totals.efficiency}%</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

function ProfitabilityRow({
  row,
}: {
  row: ProfitabilityRow
}) {
  return (
    <tr className="border-b last:border-0">
      <td className="px-4 py-3">{row.propertyName}</td>
      <td className="px-4 py-3 text-right">{row.budgetedHours}t</td>
      <td className="px-4 py-3 text-right">{row.actualHours}t</td>
      <td
        className={cn(
          'px-4 py-3 text-right',
          row.delta >= 0 ? 'text-green-600' : 'text-red-500',
        )}
      >
        {row.delta >= 0 ? '+' : ''}
        {row.delta}t
      </td>
      <td className="px-4 py-3 text-right">
        <Badge
          variant={row.efficiency <= 100 ? 'success' : 'destructive'}
          className="text-xs"
        >
          {row.efficiency}%
        </Badge>
      </td>
    </tr>
  )
}

// ---------------------------------------------------------------------------
// Tab 3: Avvik overview
// ---------------------------------------------------------------------------

function AvvikTab() {
  const { t } = useTranslation('manager')
  const [dateRange, setDateRange] = useState<DateRange>('30d')
  const { data: summary, isLoading } = useAvvikSummary(dateRange)

  return (
    <div className="space-y-4">
      <DateRangeSelector value={dateRange} onChange={setDateRange} />

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-4">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-12" />
              </Card>
            ))}
          </div>
          <TableSkeleton rows={3} cols={7} />
        </div>
      ) : !summary || summary.total === 0 ? (
        <EmptyState title={t('reports.noData')} />
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label={t('reports.total')} value={summary.total} />
            <SummaryCard
              label={t('reports.bySeverity')}
              value={
                <div className="flex gap-2">
                  <Badge variant="secondary" className="text-xs">{summary.bySeverity.low} L</Badge>
                  <Badge variant="warning" className="text-xs">{summary.bySeverity.medium} M</Badge>
                  <Badge variant="destructive" className="text-xs">{summary.bySeverity.high} H</Badge>
                </div>
              }
            />
            <SummaryCard
              label={t('reports.open')}
              value={summary.byStatus.new + summary.byStatus.in_progress}
            />
            <SummaryCard
              label={t('reports.resolved')}
              value={summary.byStatus.resolved}
            />
          </div>

          {/* Property breakdown table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-4 py-3 font-medium">{t('reports.property')}</th>
                    <th className="px-4 py-3 font-medium text-right">{t('reports.total')}</th>
                    <th className="px-4 py-3 font-medium text-right">
                      <Badge variant="secondary" className="text-xs font-medium">Low</Badge>
                    </th>
                    <th className="px-4 py-3 font-medium text-right">
                      <Badge variant="warning" className="text-xs font-medium">Med</Badge>
                    </th>
                    <th className="px-4 py-3 font-medium text-right">
                      <Badge variant="destructive" className="text-xs font-medium">High</Badge>
                    </th>
                    <th className="px-4 py-3 font-medium text-right">{t('reports.open')}</th>
                    <th className="px-4 py-3 font-medium text-right">{t('reports.resolved')}</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.byProperty.map((row) => (
                    <tr key={row.propertyId} className="border-b last:border-0">
                      <td className="px-4 py-3">{row.propertyName}</td>
                      <td className="px-4 py-3 text-right font-semibold">{row.total}</td>
                      <td className="px-4 py-3 text-right">{row.low}</td>
                      <td className="px-4 py-3 text-right">{row.medium}</td>
                      <td className="px-4 py-3 text-right">{row.high}</td>
                      <td className="px-4 py-3 text-right">{row.open}</td>
                      <td className="px-4 py-3 text-right">{row.resolved}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

function SummaryCard({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <Card className="p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Tab 4: Photo gallery
// ---------------------------------------------------------------------------

function PhotoGalleryTab() {
  const { t } = useTranslation('manager')
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | undefined>()
  const { data: properties } = useProperties()
  const { data: photos, isLoading } = usePhotoGallery(selectedPropertyId)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
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
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="p-2">
              <Skeleton className="aspect-square w-full rounded-md" />
              <Skeleton className="mt-2 h-4 w-2/3" />
              <Skeleton className="mt-1 h-3 w-1/2" />
            </Card>
          ))}
        </div>
      ) : !photos?.length ? (
        <EmptyState title={t('reports.noPhotos')} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {photos.map((photo) => (
            <PhotoCard key={photo.id} photo={photo} />
          ))}
        </div>
      )}
    </div>
  )
}

function PhotoCard({ photo }: { photo: PhotoItem }) {
  const [url, setUrl] = useState<string | null>(null)
  const [loadError, setLoadError] = useState(false)

  // Load signed URL on mount
  useState(() => {
    getPhotoUrl(photo.storagePath)
      .then(setUrl)
      .catch(() => setLoadError(true))
  })

  return (
    <Card className="overflow-hidden">
      <div className="aspect-square bg-muted flex items-center justify-center">
        {url && !loadError ? (
          <img
            src={url}
            alt={photo.propertyName}
            className="h-full w-full object-cover"
            onError={() => setLoadError(true)}
          />
        ) : (
          <Image className="h-8 w-8 text-muted-foreground" />
        )}
      </div>
      <div className="p-3">
        <p className="text-sm font-medium truncate">{photo.propertyName || '—'}</p>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="secondary" className="text-xs">
            {photo.entityType === 'avvik' ? 'Avvik' : 'Task'}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {format(parseISO(photo.uploadedAt), 'd. MMM yyyy', { locale: nb })}
          </span>
        </div>
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Skeleton helper
// ---------------------------------------------------------------------------

function TableSkeleton({ rows, cols }: { rows: number; cols: number }) {
  return (
    <Card>
      <div className="p-4 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4">
            {Array.from({ length: cols }).map((_, j) => (
              <Skeleton key={j} className="h-5 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </Card>
  )
}
