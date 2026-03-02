import { supabase } from '@/lib/supabase'
import { useSupabaseMutation } from '@/hooks/useSupabaseMutation'
import type { TimeLog } from '@/types/database'

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const timeLogKeys = {
  all: ['time-logs'] as const,
  forProperty: (propertyId: string) =>
    ['time-logs', 'property', propertyId] as const,
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
// Hooks
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
