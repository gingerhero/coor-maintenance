import { useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'
import { useProperties } from '@/features/properties/hooks/useProperties'
import {
  useAllTimesheets,
  useAllJanitors,
  useApproveTimeLog,
  useRejectTimeLog,
  useBulkApproveTimeLogs,
  type TimesheetFilters as Filters,
} from '@/features/manager/hooks/useManagerTimesheets'
import { TimesheetFilters } from '@/features/manager/components/TimesheetFilters'
import { TimesheetTable } from '@/features/manager/components/TimesheetTable'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TimesheetsPage() {
  const { t } = useTranslation('manager')
  const profile = useAuthStore((s) => s.profile)

  // Filter state
  const [filters, setFilters] = useState<Filters>({})
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Data
  const { data: logs, isLoading } = useAllTimesheets(filters)
  const { data: properties } = useProperties()
  const { data: janitors } = useAllJanitors()

  // Mutations
  const approveTimeLog = useApproveTimeLog()
  const rejectTimeLog = useRejectTimeLog()
  const bulkApprove = useBulkApproveTimeLogs()

  const isPending =
    approveTimeLog.isPending || rejectTimeLog.isPending || bulkApprove.isPending

  // Summary stats
  const stats = useMemo(() => {
    if (!logs) return { total: 0, draft: 0, submitted: 0, approved: 0 }
    return {
      total: logs.length,
      draft: logs.filter((l) => l.status === 'draft').length,
      submitted: logs.filter((l) => l.status === 'submitted').length,
      approved: logs.filter((l) => l.status === 'approved').length,
    }
  }, [logs])

  // Filter handlers (same pattern as AvvikInboxPage)
  const handleFilterChange = useCallback(
    (key: keyof Filters, value: string | undefined) => {
      setFilters((prev) => {
        if (value === undefined) {
          const next = { ...prev }
          delete next[key]
          return next
        }
        return { ...prev, [key]: value }
      })
      // Clear selection on filter change
      setSelectedIds(new Set())
    },
    [],
  )

  const handleClearFilters = useCallback(() => {
    setFilters({})
    setSelectedIds(new Set())
  }, [])

  // Selection handlers
  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    if (!logs) return
    const submittedLogs = logs.filter((l) => l.status === 'submitted')
    const allSelected = submittedLogs.every((l) => selectedIds.has(l.id))

    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(submittedLogs.map((l) => l.id)))
    }
  }, [logs, selectedIds])

  // Action handlers
  const handleApprove = useCallback(
    (id: string) => {
      if (!profile) return
      approveTimeLog.mutate({ id, approved_by: profile.id })
    },
    [profile, approveTimeLog],
  )

  const handleReject = useCallback(
    (id: string) => {
      rejectTimeLog.mutate({ id })
    },
    [rejectTimeLog],
  )

  const handleBulkApprove = useCallback(() => {
    if (!profile || selectedIds.size === 0) return
    bulkApprove.mutate(
      { ids: Array.from(selectedIds), approvedBy: profile.id },
      {
        onSuccess: () => {
          setSelectedIds(new Set())
        },
      },
    )
  }, [profile, selectedIds, bulkApprove])

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('timesheets.title')}</h1>
        {selectedIds.size > 0 && (
          <Button
            onClick={handleBulkApprove}
            disabled={isPending}
            className="gap-1.5"
          >
            <Check className="h-4 w-4" />
            {t('timesheets.bulkApprove', { count: selectedIds.size })}
          </Button>
        )}
      </div>

      {/* Filters */}
      <TimesheetFilters
        filters={filters}
        properties={properties ?? []}
        janitors={janitors ?? []}
        onFilterChange={handleFilterChange}
        onClear={handleClearFilters}
      />

      {/* Summary stats */}
      {logs && logs.length > 0 && (
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span>{t('timesheets.summary.total', { count: stats.total })}</span>
          <span>{t('timesheets.summary.draft', { count: stats.draft })}</span>
          <span>
            {t('timesheets.summary.submitted', { count: stats.submitted })}
          </span>
          <span>
            {t('timesheets.summary.approved', { count: stats.approved })}
          </span>
        </div>
      )}

      {/* Table */}
      <TimesheetTable
        logs={logs}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onSelectAll={handleSelectAll}
        onApprove={handleApprove}
        onReject={handleReject}
        isPending={isPending}
        isLoading={isLoading}
      />
    </div>
  )
}
