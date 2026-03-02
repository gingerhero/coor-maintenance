import { supabase } from '@/lib/supabase'
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery'
import { useSupabaseMutation } from '@/hooks/useSupabaseMutation'
import { useAuthStore } from '@/stores/authStore'
import type { TimeLog, Property } from '@/types/database'

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const timeLogKeys = {
  all: ['time-logs'] as const,
  forProperty: (propertyId: string) =>
    ['time-logs', 'property', propertyId] as const,
  forJanitor: (janitorId: string) =>
    ['time-logs', 'janitor', janitorId] as const,
  forWeek: (janitorId: string, weekStart: string) =>
    ['time-logs', 'week', janitorId, weekStart] as const,
}

// ---------------------------------------------------------------------------
// Query result types
// ---------------------------------------------------------------------------

export type TimeLogWithProperty = TimeLog & {
  property: Pick<Property, 'id' | 'name'>
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CreateTimeLogVariables {
  janitor_id: string
  property_id: string
  assignment_id: string
  check_in_at: string
  check_out_at: string
  actual_minutes: number
  note?: string
  status: 'draft'
}

// ---------------------------------------------------------------------------
// Query hooks
// ---------------------------------------------------------------------------

/**
 * Fetches time logs for the current janitor, joining the property name.
 *
 * Results are sorted by date descending. An optional date range can be
 * provided to filter logs within a specific period.
 */
export function useMyTimeLogs(dateRange?: { from: string; to: string }) {
  const profile = useAuthStore((s) => s.profile)
  const janitorId = profile?.id ?? ''

  return useSupabaseQuery(
    [...timeLogKeys.forJanitor(janitorId), dateRange?.from, dateRange?.to] as const,
    () => {
      let query = supabase
        .from('time_logs')
        .select('*, property:properties(id, name)')
        .eq('janitor_id', janitorId)
        .order('date', { ascending: false })

      if (dateRange?.from) {
        query = query.gte('date', dateRange.from)
      }
      if (dateRange?.to) {
        query = query.lte('date', dateRange.to)
      }

      return query.returns<TimeLogWithProperty[]>()
    },
    { enabled: !!janitorId },
  )
}

/**
 * Fetches time logs for the current janitor for the given week.
 *
 * Returns all logs within the week so the component can group and
 * summarise them as needed (total hours, per-day breakdown, etc.).
 */
export function useWeeklyTimeSummary(weekStart: string, weekEnd: string) {
  const profile = useAuthStore((s) => s.profile)
  const janitorId = profile?.id ?? ''

  return useSupabaseQuery(
    timeLogKeys.forWeek(janitorId, weekStart),
    () =>
      supabase
        .from('time_logs')
        .select('*, property:properties(id, name)')
        .eq('janitor_id', janitorId)
        .gte('date', weekStart)
        .lte('date', weekEnd)
        .order('date', { ascending: true })
        .returns<TimeLogWithProperty[]>(),
    { enabled: !!janitorId },
  )
}

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

/**
 * Mutation to create a time log entry.
 *
 * Inserts a record into `time_logs` with check-in/check-out timestamps,
 * actual minutes worked, and an optional note. The status is always 'draft'
 * on creation — managers approve later.
 *
 * Invalidates all time-log queries so lists update immediately.
 */
export function useCreateTimeLog() {
  return useSupabaseMutation<TimeLog, CreateTimeLogVariables>({
    mutationFn: (variables) =>
      supabase
        .from('time_logs')
        .insert({
          janitor_id: variables.janitor_id,
          property_id: variables.property_id,
          assignment_id: variables.assignment_id,
          date: variables.check_out_at.split('T')[0],
          actual_minutes: variables.actual_minutes,
          notes: variables.note ?? null,
          status: variables.status,
        })
        .select()
        .single(),
    invalidateKeys: [timeLogKeys.all],
  })
}
