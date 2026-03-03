import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Building2,
  MapPin,
  ArrowUpDown,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PropertyRow {
  id: string
  name: string
  address: string
  lastVisitDate: string | null
  completionPercent: number
  openAvvikCount: number
}

interface PropertyTableProps {
  properties: PropertyRow[]
  loading?: boolean
  onPropertyClick: (id: string) => void
}

type SortField = 'name' | 'lastVisitDate' | 'completionPercent' | 'openAvvikCount'
type SortDirection = 'asc' | 'desc'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function PropertyTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-lg" />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Mobile card layout
// ---------------------------------------------------------------------------

function PropertyCard({
  property,
  onClick,
}: {
  property: PropertyRow
  onClick: () => void
}) {
  const { t } = useTranslation('manager')

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md active:shadow-sm"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate text-base font-semibold">
                {property.name}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{property.address}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>
                {t('dashboard.lastVisit')}: {formatDate(property.lastVisitDate)}
              </span>
              <span>{property.completionPercent}%</span>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1.5">
            {property.openAvvikCount > 0 && (
              <Badge variant="warning" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {property.openAvvikCount}
              </Badge>
            )}
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Sort header button
// ---------------------------------------------------------------------------

function SortHeader({
  label,
  field,
  currentField,
  currentDirection,
  onSort,
  className,
}: {
  label: string
  field: SortField
  currentField: SortField
  currentDirection: SortDirection
  onSort: (field: SortField) => void
  className?: string
}) {
  const isActive = currentField === field
  return (
    <button
      type="button"
      className={cn(
        'flex items-center gap-1 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground',
        isActive && 'text-foreground',
        className,
      )}
      onClick={() => onSort(field)}
    >
      {label}
      <ArrowUpDown
        className={cn(
          'h-3.5 w-3.5',
          isActive ? 'opacity-100' : 'opacity-40',
          isActive && currentDirection === 'desc' && 'rotate-180',
        )}
      />
    </button>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PropertyTable({
  properties,
  loading,
  onPropertyClick,
}: PropertyTableProps) {
  const { t } = useTranslation('manager')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sorted = useMemo(() => {
    const arr = [...properties]
    arr.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'name':
          cmp = a.name.localeCompare(b.name, 'nb')
          break
        case 'lastVisitDate':
          cmp =
            (a.lastVisitDate ?? '').localeCompare(b.lastVisitDate ?? '')
          break
        case 'completionPercent':
          cmp = a.completionPercent - b.completionPercent
          break
        case 'openAvvikCount':
          cmp = a.openAvvikCount - b.openAvvikCount
          break
      }
      return sortDirection === 'desc' ? -cmp : cmp
    })
    return arr
  }, [properties, sortField, sortDirection])

  if (loading) {
    return <PropertyTableSkeleton />
  }

  return (
    <>
      {/* Mobile: card list */}
      <div className="space-y-3 md:hidden">
        {sorted.map((property) => (
          <PropertyCard
            key={property.id}
            property={property}
            onClick={() => onPropertyClick(property.id)}
          />
        ))}
      </div>

      {/* Desktop: table layout */}
      <div className="hidden md:block">
        <div className="overflow-hidden rounded-lg border border-border">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_1fr_140px_100px_80px] gap-4 border-b border-border bg-muted/50 px-4 py-3">
            <SortHeader
              label={t('property.title')}
              field="name"
              currentField={sortField}
              currentDirection={sortDirection}
              onSort={handleSort}
            />
            <SortHeader
              label={t('property.address')}
              field="name"
              currentField={sortField}
              currentDirection={sortDirection}
              onSort={handleSort}
              className="pointer-events-none opacity-0"
            />
            <SortHeader
              label={t('dashboard.lastVisit')}
              field="lastVisitDate"
              currentField={sortField}
              currentDirection={sortDirection}
              onSort={handleSort}
            />
            <SortHeader
              label={t('dashboard.completion')}
              field="completionPercent"
              currentField={sortField}
              currentDirection={sortDirection}
              onSort={handleSort}
            />
            <SortHeader
              label={t('dashboard.openAvvikShort')}
              field="openAvvikCount"
              currentField={sortField}
              currentDirection={sortDirection}
              onSort={handleSort}
            />
          </div>

          {/* Table rows */}
          {sorted.map((property) => (
            <div
              key={property.id}
              className="grid cursor-pointer grid-cols-[1fr_1fr_140px_100px_80px] gap-4 border-b border-border px-4 py-3 transition-colors last:border-b-0 hover:bg-muted/30"
              role="button"
              tabIndex={0}
              onClick={() => onPropertyClick(property.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onPropertyClick(property.id)
                }
              }}
            >
              <div className="flex items-center gap-2 truncate">
                <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate font-medium">{property.name}</span>
              </div>
              <div className="flex items-center truncate text-sm text-muted-foreground">
                {property.address}
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                {formatDate(property.lastVisitDate)}
              </div>
              <div className="flex items-center">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        property.completionPercent >= 80
                          ? 'bg-coor-green-500'
                          : property.completionPercent >= 50
                            ? 'bg-coor-orange-500'
                            : 'bg-destructive',
                      )}
                      style={{ width: `${property.completionPercent}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {property.completionPercent}%
                  </span>
                </div>
              </div>
              <div className="flex items-center">
                {property.openAvvikCount > 0 ? (
                  <Badge variant="warning" className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {property.openAvvikCount}
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">0</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
