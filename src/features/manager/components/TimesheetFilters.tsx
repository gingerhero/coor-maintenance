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
import type { Property } from '@/types/database'
import type { TimesheetFilters as Filters } from '@/features/manager/hooks/useManagerTimesheets'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TimesheetFiltersProps {
  filters: Filters
  properties: Property[]
  janitors: { id: string; full_name: string }[]
  onFilterChange: (key: keyof Filters, value: string | undefined) => void
  onClear: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TimesheetFilters({
  filters,
  properties,
  janitors,
  onFilterChange,
  onClear,
}: TimesheetFiltersProps) {
  const { t } = useTranslation('manager')

  const hasActiveFilters =
    filters.janitorId ||
    filters.propertyId ||
    filters.status ||
    filters.dateFrom ||
    filters.dateTo

  return (
    <div className="flex flex-wrap gap-3 rounded-lg bg-muted/50 p-4">
      {/* Janitor filter */}
      <Select
        value={filters.janitorId ?? ''}
        onValueChange={(v) =>
          onFilterChange('janitorId', v === '__all__' ? undefined : v)
        }
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder={t('timesheets.allJanitors')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">
            {t('timesheets.allJanitors')}
          </SelectItem>
          {janitors.map((j) => (
            <SelectItem key={j.id} value={j.id}>
              {j.full_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Property filter */}
      <Select
        value={filters.propertyId ?? ''}
        onValueChange={(v) =>
          onFilterChange('propertyId', v === '__all__' ? undefined : v)
        }
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder={t('timesheets.allProperties')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">
            {t('timesheets.allProperties')}
          </SelectItem>
          {properties.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
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
          <SelectValue placeholder={t('timesheets.allStatuses')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">
            {t('timesheets.allStatuses')}
          </SelectItem>
          <SelectItem value="draft">
            {t('timesheets.status.draft')}
          </SelectItem>
          <SelectItem value="submitted">
            {t('timesheets.status.submitted')}
          </SelectItem>
          <SelectItem value="approved">
            {t('timesheets.status.approved')}
          </SelectItem>
        </SelectContent>
      </Select>

      {/* Date from */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">
          {t('timesheets.dateFrom')}
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
          {t('timesheets.dateTo')}
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
          {t('timesheets.clearFilters')}
        </Button>
      )}
    </div>
  )
}
