import { supabase } from '@/lib/supabase'
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery'
import { useSupabaseMutation } from '@/hooks/useSupabaseMutation'
import { useAuthStore } from '@/stores/authStore'
import type { Assignment, Property } from '@/types/database'

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const assignmentKeys = {
  all: ['assignments'] as const,
  forDate: (date: string) => ['assignments', 'date', date] as const,
  upcoming: (days: number) => ['assignments', 'upcoming', days] as const,
  detail: (id: string) => ['assignments', id] as const,
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AssignmentWithProperty = Assignment & {
  property: Pick<Property, 'id' | 'name' | 'address' | 'estimated_weekly_hours' | 'customer_id'>
}

interface CheckInVariables {
  id: string
  checkin_lat: number | null
  checkin_lng: number | null
  checkin_accuracy: number | null
  checkin_note: string | null
}

interface CheckOutVariables {
  id: string
  checkout_lat: number | null
  checkout_lng: number | null
  checkout_accuracy: number | null
  checkout_note: string | null
  actual_minutes: number
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Fetches assignments for the current janitor within a date range.
 *
 * Joins through `assignment_janitors` (inner join) to filter by the
 * authenticated user, and includes the related property data.
 */
export function useMyAssignments(dateFrom: string, dateTo: string) {
  const userId = useAuthStore.getState().profile?.id

  return useSupabaseQuery(
    [...assignmentKeys.all, 'range', dateFrom, dateTo] as const,
    () =>
      supabase
        .from('assignments')
        .select(
          '*, property:properties(id, name, address, estimated_weekly_hours, customer_id), assignment_janitors!inner(janitor_id)',
        )
        .eq('assignment_janitors.janitor_id', userId!)
        .gte('scheduled_date', dateFrom)
        .lte('scheduled_date', dateTo)
        .order('scheduled_date')
        .returns<AssignmentWithProperty[]>(),
    { enabled: !!userId },
  )
}

/**
 * Fetches a single assignment by ID with its related property.
 */
export function useAssignment(id: string | undefined) {
  return useSupabaseQuery(
    assignmentKeys.detail(id ?? ''),
    () =>
      supabase
        .from('assignments')
        .select(
          '*, property:properties(id, name, address, estimated_weekly_hours, customer_id)',
        )
        .eq('id', id!)
        .single()
        .returns<AssignmentWithProperty>(),
    { enabled: !!id },
  )
}

/**
 * Mutation to check in to an assignment.
 *
 * Sets the status to `in_progress`, records GPS coordinates and an
 * optional check-in note, and invalidates all assignment queries.
 */
export function useCheckIn() {
  return useSupabaseMutation<AssignmentWithProperty, CheckInVariables>({
    mutationFn: ({ id, ...data }) =>
      supabase
        .from('assignments')
        .update({
          status: 'in_progress' as const,
          checkin_at: new Date().toISOString(),
          checkin_lat: data.checkin_lat,
          checkin_lng: data.checkin_lng,
          checkin_accuracy: data.checkin_accuracy,
          checkin_note: data.checkin_note,
        })
        .eq('id', id)
        .select(
          '*, property:properties(id, name, address, estimated_weekly_hours, customer_id)',
        )
        .single(),
    invalidateKeys: [assignmentKeys.all],
  })
}

/**
 * Mutation to check out of an assignment.
 *
 * Sets the status to `completed`, records GPS coordinates, check-out note,
 * actual minutes, and invalidates all assignment queries.
 */
export function useCheckOut() {
  return useSupabaseMutation<AssignmentWithProperty, CheckOutVariables>({
    mutationFn: ({ id, ...data }) =>
      supabase
        .from('assignments')
        .update({
          status: 'completed' as const,
          checkout_at: new Date().toISOString(),
          checkout_lat: data.checkout_lat,
          checkout_lng: data.checkout_lng,
          checkout_accuracy: data.checkout_accuracy,
          checkout_note: data.checkout_note,
          actual_minutes: data.actual_minutes,
        })
        .eq('id', id)
        .select(
          '*, property:properties(id, name, address, estimated_weekly_hours, customer_id)',
        )
        .single(),
    invalidateKeys: [assignmentKeys.all],
  })
}
