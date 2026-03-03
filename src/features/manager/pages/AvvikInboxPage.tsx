import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { format, parseISO } from 'date-fns'
import { nb } from 'date-fns/locale'
import { AlertTriangle, User, Calendar } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { useProperties } from '@/features/properties/hooks/useProperties'
import {
  useAllManagerAvvik,
  type AvvikInboxFilters as Filters,
  type AvvikInboxItem,
} from '@/features/manager/hooks/useManagerAvvik'
import { AvvikInboxFilters } from '@/features/manager/components/AvvikInboxFilters'
import { AvvikDetailSheet } from '@/features/manager/components/AvvikDetailSheet'
import { parseAvvikDescription } from '@/features/avvik/hooks/useAvvik'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function severityVariant(severity: string) {
  switch (severity) {
    case 'high':
      return 'destructive' as const
    case 'medium':
      return 'warning' as const
    case 'low':
    default:
      return 'secondary' as const
  }
}

function statusVariant(status: string) {
  switch (status) {
    case 'new':
      return 'default' as const
    case 'in_progress':
      return 'warning' as const
    case 'resolved':
      return 'success' as const
    default:
      return 'secondary' as const
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AvvikInboxPage() {
  const { t } = useTranslation('manager')

  const [filters, setFilters] = useState<Filters>({})
  const [selectedAvvik, setSelectedAvvik] = useState<AvvikInboxItem | null>(
    null,
  )
  const [sheetOpen, setSheetOpen] = useState(false)

  const { data: avvik, isLoading } = useAllManagerAvvik(filters)
  const { data: properties } = useProperties()

  const openCount =
    avvik?.filter((a) => a.status !== 'resolved').length ?? 0

  function handleFilterChange(
    key: keyof Filters,
    value: string | undefined,
  ) {
    setFilters((prev) => {
      if (value === undefined) {
        const next = { ...prev }
        delete next[key]
        return next
      }
      return { ...prev, [key]: value }
    })
  }

  function handleClearFilters() {
    setFilters({})
  }

  function handleSelectAvvik(item: AvvikInboxItem) {
    setSelectedAvvik(item)
    setSheetOpen(true)
  }

  function handleCloseSheet() {
    setSheetOpen(false)
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">{t('avvikInbox.title')}</h1>
        <Badge variant="default">
          {t('avvikInbox.openCount', { count: openCount })}
        </Badge>
      </div>

      {/* Filters */}
      <AvvikInboxFilters
        filters={filters}
        properties={properties ?? []}
        onFilterChange={handleFilterChange}
        onClear={handleClearFilters}
      />

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : !avvik || avvik.length === 0 ? (
        <EmptyState
          icon={<AlertTriangle />}
          title={t('avvikInbox.noAvvik')}
          description={t('avvikInbox.noAvvikDescription')}
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block">
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t('avvikInbox.columns.title')}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t('avvikInbox.columns.property')}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t('avvikInbox.columns.severity')}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t('avvikInbox.columns.status')}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t('avvikInbox.columns.reporter')}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t('avvikInbox.columns.date')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {avvik.map((item) => {
                    const { title } = parseAvvikDescription(item.description)
                    return (
                      <tr
                        key={item.id}
                        className="cursor-pointer transition-colors hover:bg-muted/50"
                        onClick={() => handleSelectAvvik(item)}
                      >
                        <td className="max-w-[250px] truncate px-4 py-3 font-medium">
                          {title}
                        </td>
                        <td className="px-4 py-3">
                          {item.property.name}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={severityVariant(item.severity)}>
                            {t(`avvikTimeline.severity.${item.severity}`)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={statusVariant(item.status)}>
                            {t(`avvikTimeline.status.${item.status}`)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {item.reported_by_profile?.full_name ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {format(parseISO(item.created_at), 'd. MMM yyyy', {
                            locale: nb,
                          })}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile card layout */}
          <div className="space-y-3 sm:hidden">
            {avvik.map((item) => {
              const { title } = parseAvvikDescription(item.description)
              return (
                <div
                  key={item.id}
                  className="cursor-pointer rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
                  onClick={() => handleSelectAvvik(item)}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={severityVariant(item.severity)}>
                      {t(`avvikTimeline.severity.${item.severity}`)}
                    </Badge>
                    <Badge variant={statusVariant(item.status)}>
                      {t(`avvikTimeline.status.${item.status}`)}
                    </Badge>
                  </div>
                  <h3 className="mt-2 text-sm font-semibold leading-tight">
                    {title}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.property.name}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {item.reported_by_profile?.full_name ?? '—'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(parseISO(item.created_at), 'd. MMM yyyy', {
                        locale: nb,
                      })}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Detail sheet */}
      <AvvikDetailSheet
        avvik={selectedAvvik}
        open={sheetOpen}
        onClose={handleCloseSheet}
      />
    </div>
  )
}
