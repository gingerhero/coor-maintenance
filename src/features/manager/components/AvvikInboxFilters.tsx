import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useNS3451Codes } from '@/features/ns3451/hooks/useNS3451Codes'
import type { Property } from '@/types/database'
import type { AvvikInboxFilters as Filters } from '@/features/manager/hooks/useManagerAvvik'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AvvikInboxFiltersProps {
  filters: Filters
  properties: Property[]
  onFilterChange: (key: keyof Filters, value: string | undefined) => void
  onClear: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AvvikInboxFilters({
  filters,
  properties,
  onFilterChange,
  onClear,
}: AvvikInboxFiltersProps) {
  const { t } = useTranslation('manager')
  const { codesByLevel } = useNS3451Codes()
  const level1Codes = codesByLevel.get(1) ?? []

  const hasActiveFilters =
    filters.propertyId ||
    filters.severity ||
    filters.status ||
    filters.ns3451Category ||
    filters.dateFrom ||
    filters.dateTo

  return (
    <div className="flex flex-wrap gap-3 rounded-lg bg-muted/50 p-4">
      {/* Property filter */}
      <Select
        value={filters.propertyId ?? ''}
        onValueChange={(v) =>
          onFilterChange('propertyId', v === '__all__' ? undefined : v)
        }
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder={t('avvikInbox.allProperties')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">
            {t('avvikInbox.allProperties')}
          </SelectItem>
          {properties.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Severity filter */}
      <Select
        value={filters.severity ?? ''}
        onValueChange={(v) =>
          onFilterChange('severity', v === '__all__' ? undefined : v)
        }
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder={t('avvikInbox.allSeverities')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">
            {t('avvikInbox.allSeverities')}
          </SelectItem>
          <SelectItem value="low">
            {t('avvikTimeline.severity.low')}
          </SelectItem>
          <SelectItem value="medium">
            {t('avvikTimeline.severity.medium')}
          </SelectItem>
          <SelectItem value="high">
            {t('avvikTimeline.severity.high')}
          </SelectItem>
        </SelectContent>
      </Select>

      {/* Status filter */}
      <Select
        value={filters.status ?? ''}
        onValueChange={(v) =>
          onFilterChange('status', v === '__all__' ? undefined : v)
        }
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder={t('avvikInbox.allStatuses')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">
            {t('avvikInbox.allStatuses')}
          </SelectItem>
          <SelectItem value="new">
            {t('avvikTimeline.status.new')}
          </SelectItem>
          <SelectItem value="in_progress">
            {t('avvikTimeline.status.in_progress')}
          </SelectItem>
          <SelectItem value="resolved">
            {t('avvikTimeline.status.resolved')}
          </SelectItem>
        </SelectContent>
      </Select>

      {/* NS3451 category filter */}
      <Select
        value={filters.ns3451Category ?? ''}
        onValueChange={(v) =>
          onFilterChange('ns3451Category', v === '__all__' ? undefined : v)
        }
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder={t('avvikInbox.allCategories')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">
            {t('avvikInbox.allCategories')}
          </SelectItem>
          {level1Codes.map((code) => (
            <SelectItem key={code.id} value={code.code}>
              {code.code} – {code.title_nb}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Date from */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">
          {t('avvikInbox.dateFrom')}
        </label>
        <input
          type="date"
          className="h-11 rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-coor-blue-500 focus:ring-offset-1"
          value={filters.dateFrom ?? ''}
          onChange={(e) =>
            onFilterChange('dateFrom', e.target.value || undefined)
          }
        />
      </div>

      {/* Date to */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">
          {t('avvikInbox.dateTo')}
        </label>
        <input
          type="date"
          className="h-11 rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-coor-blue-500 focus:ring-offset-1"
          value={filters.dateTo ?? ''}
          onChange={(e) =>
            onFilterChange('dateTo', e.target.value || undefined)
          }
        />
      </div>

      {/* Clear filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="self-end"
          onClick={onClear}
        >
          <X className="mr-1 h-4 w-4" />
          {t('avvikInbox.clearFilters')}
        </Button>
      )}
    </div>
  )
}
