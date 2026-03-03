import { useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery'
import type { Assignment, Avvik, TimeLog } from '@/types/database'

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const propertyDetailKeys = {
  visits: (propertyId: string) =>
    ['manager', 'property', propertyId, 'visits'] as const,
  timeSummary: (propertyId: string) =>
    ['manager', 'property', propertyId, 'time'] as const,
  stats: (propertyId: string) =>
    ['manager', 'property', propertyId, 'stats'] as const,
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PropertyVisit = Assignment & {
  assignment_janitors: Array<{ janitor: { id: string; full_name: string } }>
  task_executions: Array<{ count: number }>
  avvik: Array<{ count: number }>
}

export type PropertyTimeLog = TimeLog & {
  janitor: Pick<Profile, 'id' | 'full_name'>
}

// We only need a subset of Profile here
interface Profile {
  id: string
  full_name: string
}

export interface PropertyStats {
  totalVisits: number
  completionRate: number
  totalHours: number
  openAvvikCount: number
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Fetches all assignments (visits) for a property, ordered by scheduled_date
 * desc. Joins janitors, task execution count, and avvik count.
 */
export function usePropertyVisits(propertyId: string | undefined) {
  return useSupabaseQuery(
    propertyDetailKeys.visits(propertyId ?? ''),
    () =>
      supabase
        .from('assignments')
        .select(
          '*, assignment_janitors(janitor:profiles(id, full_name)), task_executions(count), avvik(count)',
        )
        .eq('property_id', propertyId!)
        .order('scheduled_date', { ascending: false })
        .returns<PropertyVisit[]>(),
    { enabled: !!propertyId },
  )
}

/**
 * Fetches time_logs for a property, ordered by date desc.
 * Joins janitor profile for display name.
 */
export function usePropertyTimeSummary(propertyId: string | undefined) {
  return useSupabaseQuery(
    propertyDetailKeys.timeSummary(propertyId ?? ''),
    () =>
      supabase
        .from('time_logs')
        .select('*, janitor:profiles!time_logs_janitor_id_fkey(id, full_name)')
        .eq('property_id', propertyId!)
        .order('date', { ascending: false })
        .returns<PropertyTimeLog[]>(),
    { enabled: !!propertyId },
  )
}

/**
 * Returns aggregate stats for a property: total visits, completion rate,
 * total hours worked, and open avvik count.
 *
 * Uses `useQuery` directly since we orchestrate multiple parallel calls.
 */
export function usePropertyStats(propertyId: string | undefined) {
  return useQuery<PropertyStats, Error>({
    queryKey: propertyDetailKeys.stats(propertyId ?? ''),
    queryFn: async () => {
      const [assignmentsResult, avvikResult, timeLogsResult] =
        await Promise.all([
          // All assignments for this property
          supabase
            .from('assignments')
            .select('id, status, actual_minutes')
            .eq('property_id', propertyId!)
            .returns<Pick<Assignment, 'id' | 'status' | 'actual_minutes'>[]>(),

          // Open avvik (not resolved)
          supabase
            .from('avvik')
            .select('id', { count: 'exact', head: true })
            .eq('property_id', propertyId!)
            .neq('status', 'resolved')
            .returns<Pick<Avvik, 'id'>[]>(),

          // Time logs for total hours
          supabase
            .from('time_logs')
            .select('actual_minutes')
            .eq('property_id', propertyId!)
            .returns<Pick<TimeLog, 'actual_minutes'>[]>(),
        ])

      if (assignmentsResult.error) throw new Error(assignmentsResult.error.message)
      if (avvikResult.error) throw new Error(avvikResult.error.message)
      if (timeLogsResult.error) throw new Error(timeLogsResult.error.message)

      const assignments = assignmentsResult.data ?? []
      const timeLogs = timeLogsResult.data ?? []

      const totalVisits = assignments.length
      const completedVisits = assignments.filter(
        (a) => a.status === 'completed',
      ).length
      const completionRate =
        totalVisits > 0
          ? Math.round((completedVisits / totalVisits) * 100)
          : 0

      const totalMinutes = timeLogs.reduce(
        (sum, tl) => sum + (tl.actual_minutes ?? 0),
        0,
      )
      const totalHours = Math.round((totalMinutes / 60) * 10) / 10

      const openAvvikCount = avvikResult.count ?? 0

      return {
        totalVisits,
        completionRate,
        totalHours,
        openAvvikCount,
      }
    },
    enabled: !!propertyId,
    staleTime: 5 * 60 * 1000,
  })
}
