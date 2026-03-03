import {
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery'
import { useSupabaseMutation } from '@/hooks/useSupabaseMutation'
import type { TimeLog, TimeLogStatus, Property, Profile } from '@/types/database'

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const timesheetKeys = {
  all: ['manager', 'timesheets'] as const,
  filtered: (filters: TimesheetFilters) =>
    [
      'manager',
      'timesheets',
      'filtered',
      filters.janitorId ?? '',
      filters.propertyId ?? '',
      filters.status ?? '',
      filters.dateFrom ?? '',
      filters.dateTo ?? '',
    ] as const,
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TimesheetFilters {
  janitorId?: string
  propertyId?: string
  status?: TimeLogStatus
  dateFrom?: string
  dateTo?: string
}

export type TimeLogWithRelations = TimeLog & {
  janitor: Pick<Profile, 'id' | 'full_name'>
  property: Pick<Property, 'id' | 'name'>
}

// ---------------------------------------------------------------------------
// Query hooks
// ---------------------------------------------------------------------------

/**
 * Fetches all time logs visible to the manager, with dynamic filtering.
 * Joins with `profiles` for the janitor name and `properties` for property name.
 */
export function useAllTimesheets(filters: TimesheetFilters) {
  return useSupabaseQuery(
    timesheetKeys.filtered(filters),
    () => {
      let query = supabase
        .from('time_logs')
        .select(
          '*, janitor:profiles!time_logs_janitor_id_fkey(id, full_name), property:properties!time_logs_property_id_fkey(id, name)',
        )

      if (filters.janitorId) {
        query = query.eq('janitor_id', filters.janitorId)
      }

      if (filters.propertyId) {
        query = query.eq('property_id', filters.propertyId)
      }

      if (filters.status) {
        query = query.eq('status', filters.status)
      }

      if (filters.dateFrom) {
        query = query.gte('date', filters.dateFrom)
      }

      if (filters.dateTo) {
        query = query.lte('date', filters.dateTo)
      }

      return query
        .order('date', { ascending: false })
        .returns<TimeLogWithRelations[]>()
    },
    { staleTime: 60_000 },
  )
}

/**
 * Fetches all active janitors for filter dropdowns.
 */
export function useAllJanitors() {
  return useSupabaseQuery(
    ['timesheets', 'janitors'] as const,
    () =>
      supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'janitor')
        .eq('is_active', true)
        .order('full_name')
        .returns<Pick<Profile, 'id' | 'full_name'>[]>(),
    { staleTime: 5 * 60 * 1000 },
  )
}

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

/**
 * Approve a single time log entry.
 */
export function useApproveTimeLog() {
  return useSupabaseMutation<TimeLog, { id: string; approved_by: string }>({
    mutationFn: (variables) =>
      supabase
        .from('time_logs')
        .update({
          status: 'approved' as const,
          approved_by: variables.approved_by,
          approved_at: new Date().toISOString(),
        })
        .eq('id', variables.id)
        .select()
        .single(),
    invalidateKeys: [timesheetKeys.all, ['time-logs']],
  })
}

/**
 * Reject a time log by reverting it back to draft status.
 */
export function useRejectTimeLog() {
  return useSupabaseMutation<TimeLog, { id: string }>({
    mutationFn: (variables) =>
      supabase
        .from('time_logs')
        .update({
          status: 'draft' as const,
          approved_by: null,
          approved_at: null,
        })
        .eq('id', variables.id)
        .select()
        .single(),
    invalidateKeys: [timesheetKeys.all, ['time-logs']],
  })
}

/**
 * Bulk approve multiple time logs at once.
 *
 * Uses useMutation from react-query directly because the `.in('id', ids)`
 * call returns an array of rows.
 */
export function useBulkApproveTimeLogs() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (variables: { ids: string[]; approvedBy: string }) => {
      const { data, error } = await supabase
        .from('time_logs')
        .update({
          status: 'approved' as const,
          approved_by: variables.approvedBy,
          approved_at: new Date().toISOString(),
        })
        .in('id', variables.ids)
        .select()

      if (error) {
        throw new Error(error.message)
      }

      return data as TimeLog[]
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: timesheetKeys.all })
      void queryClient.invalidateQueries({ queryKey: ['time-logs'] })
    },
  })
}
