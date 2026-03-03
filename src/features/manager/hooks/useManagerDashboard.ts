import { useQuery } from '@tanstack/react-query'
import { subDays, startOfDay, format } from 'date-fns'

import { supabase } from '@/lib/supabase'
import type { Assignment, Avvik, Property, RosterEntry } from '@/types/database'

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const managerKeys = {
  all: ['manager'] as const,
  kpis: (dateRange: string) => ['manager', 'kpis', dateRange] as const,
  properties: ['manager', 'properties'] as const,
  propertyDetail: (id: string) => ['manager', 'property', id] as const,
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ManagerKPIs {
  completionRate: number
  hoursUsed: number
  hoursBudgeted: number
  openAvvikCount: number
  staffingGaps: number
}

type DateRange = '7d' | '30d' | '90d'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDateBounds(dateRange: DateRange) {
  const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90
  const now = new Date()
  const from = startOfDay(subDays(now, days))
  return {
    days,
    from: format(from, 'yyyy-MM-dd'),
    to: format(now, 'yyyy-MM-dd'),
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Fetches aggregate KPI data for the manager dashboard.
 *
 * Makes multiple parallel Supabase queries and combines the results into
 * a single `ManagerKPIs` object. Uses `useQuery` directly (not
 * `useSupabaseQuery`) because we need a custom queryFn that orchestrates
 * several calls.
 */
export function useManagerKPIs(dateRange: DateRange = '30d') {
  const { days, from, to } = getDateBounds(dateRange)

  return useQuery<ManagerKPIs, Error>({
    queryKey: managerKeys.kpis(dateRange),
    queryFn: async () => {
      const [
        assignmentsResult,
        avvikResult,
        propertiesResult,
        rosterResult,
      ] = await Promise.all([
        // 1. Assignments in the date range
        supabase
          .from('assignments')
          .select('id, status, actual_minutes')
          .gte('scheduled_date', from)
          .lte('scheduled_date', to)
          .returns<Pick<Assignment, 'id' | 'status' | 'actual_minutes'>[]>(),

        // 2. Open avvik (not resolved)
        supabase
          .from('avvik')
          .select('id', { count: 'exact', head: true })
          .neq('status', 'resolved')
          .returns<Pick<Avvik, 'id'>[]>(),

        // 3. Active properties (for budget calculation)
        supabase
          .from('properties')
          .select('id, estimated_weekly_hours')
          .eq('is_active', true)
          .returns<Pick<Property, 'id' | 'estimated_weekly_hours'>[]>(),

        // 4. Active roster entries (to find staffing gaps)
        supabase
          .from('roster_entries')
          .select('property_id')
          .is('active_to', null)
          .returns<Pick<RosterEntry, 'property_id'>[]>(),
      ])

      // Throw on any Supabase errors
      if (assignmentsResult.error) throw new Error(assignmentsResult.error.message)
      if (avvikResult.error) throw new Error(avvikResult.error.message)
      if (propertiesResult.error) throw new Error(propertiesResult.error.message)
      if (rosterResult.error) throw new Error(rosterResult.error.message)

      const assignments = assignmentsResult.data ?? []
      const properties = propertiesResult.data ?? []
      const rosterEntries = rosterResult.data ?? []

      // --- Completion rate ---
      const totalAssignments = assignments.length
      const completedAssignments = assignments.filter(
        (a) => a.status === 'completed',
      ).length
      const completionRate =
        totalAssignments > 0
          ? Math.round((completedAssignments / totalAssignments) * 100)
          : 0

      // --- Hours used ---
      const hoursUsed = Math.round(
        assignments
          .filter((a) => a.status === 'completed' && a.actual_minutes != null)
          .reduce((sum, a) => sum + (a.actual_minutes ?? 0), 0) / 60,
      )

      // --- Hours budgeted (scale weekly hours to the date range) ---
      const weeks = days / 7
      const hoursBudgeted = Math.round(
        properties.reduce(
          (sum, p) => sum + (p.estimated_weekly_hours ?? 0),
          0,
        ) * weeks,
      )

      // --- Open avvik count ---
      const openAvvikCount = avvikResult.count ?? 0

      // --- Staffing gaps ---
      const staffedPropertyIds = new Set(
        rosterEntries.map((r) => r.property_id),
      )
      const staffingGaps = properties.filter(
        (p) => !staffedPropertyIds.has(p.id),
      ).length

      return {
        completionRate,
        hoursUsed,
        hoursBudgeted,
        openAvvikCount,
        staffingGaps,
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
