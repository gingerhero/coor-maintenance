import { supabase } from '@/lib/supabase'
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery'
import { useSupabaseMutation } from '@/hooks/useSupabaseMutation'
import { useAuthStore } from '@/stores/authStore'
import type { Avvik, AvvikSeverity, AvvikStatus } from '@/types/database'

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const avvikKeys = {
  all: ['avvik'] as const,
  forProperty: (propertyId: string) =>
    ['avvik', 'property', propertyId] as const,
  forAssignment: (assignmentId: string) =>
    ['avvik', 'assignment', assignmentId] as const,
  forReporter: (userId: string) =>
    ['avvik', 'reporter', userId] as const,
  detail: (id: string) => ['avvik', id] as const,
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AvvikWithReporter = Avvik & {
  reported_by_profile?: { full_name: string }
}

interface CreateAvvikVariables {
  property_id: string
  assignment_id?: string
  title: string
  description: string
  severity: AvvikSeverity
  ns3451_code?: string
  location?: string
  gps_lat?: number
  gps_lng?: number
  gps_accuracy?: number
}

interface UpdateAvvikStatusVariables {
  id: string
  status: AvvikStatus
  resolved_by?: string
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Fetches avvik reported during a specific assignment.
 * Joins with `profiles` for the reporter name.
 */
export function useAvvikForAssignment(assignmentId: string | undefined) {
  return useSupabaseQuery(
    avvikKeys.forAssignment(assignmentId ?? ''),
    () =>
      supabase
        .from('avvik')
        .select('*, reported_by_profile:profiles!avvik_reported_by_fkey(full_name)')
        .eq('assignment_id', assignmentId!)
        .order('created_at', { ascending: false })
        .returns<AvvikWithReporter[]>(),
    { enabled: !!assignmentId },
  )
}

/**
 * Fetches all avvik for a property.
 * Joins with `profiles` for the reporter name.
 */
export function useAvvikForProperty(propertyId: string | undefined) {
  return useSupabaseQuery(
    avvikKeys.forProperty(propertyId ?? ''),
    () =>
      supabase
        .from('avvik')
        .select('*, reported_by_profile:profiles!avvik_reported_by_fkey(full_name)')
        .eq('property_id', propertyId!)
        .order('created_at', { ascending: false })
        .returns<AvvikWithReporter[]>(),
    { enabled: !!propertyId },
  )
}

/**
 * Fetches avvik reported by the current user across all properties.
 * Used on the standalone avvik page.
 */
export function useMyAvvik() {
  const userId = useAuthStore.getState().profile?.id

  return useSupabaseQuery(
    avvikKeys.forReporter(userId ?? ''),
    () =>
      supabase
        .from('avvik')
        .select('*, reported_by_profile:profiles!avvik_reported_by_fkey(full_name)')
        .eq('reported_by', userId!)
        .order('created_at', { ascending: false })
        .returns<AvvikWithReporter[]>(),
    { enabled: !!userId },
  )
}

/**
 * Mutation to create a new avvik.
 *
 * The `title` from the form is stored as the first line of `description`
 * in the database (format: "title\n\ndescription"), since the DB schema
 * does not have a separate `title` column.
 *
 * Sets `reported_by` from the auth store. Invalidates avvik queries.
 */
export function useCreateAvvik() {
  const userId = useAuthStore.getState().profile?.id

  return useSupabaseMutation<Avvik, CreateAvvikVariables>({
    mutationFn: ({
      property_id,
      assignment_id,
      title,
      description,
      severity,
      ns3451_code,
      location,
      gps_lat,
      gps_lng,
      gps_accuracy,
    }) => {
      // Combine title and description for storage.
      // AvvikCard parses them back apart.
      const combinedDescription = `${title}\n\n${description}`

      return supabase
        .from('avvik')
        .insert({
          property_id,
          assignment_id: assignment_id ?? null,
          description: combinedDescription,
          severity,
          ns3451_code: ns3451_code ?? null,
          location_description: location ?? null,
          gps_lat: gps_lat ?? null,
          gps_lng: gps_lng ?? null,
          gps_accuracy: gps_accuracy ?? null,
          reported_by: userId!,
          status: 'new' as const,
          notify_board: severity === 'high',
        })
        .select()
        .single()
    },
    invalidateKeys: [avvikKeys.all],
  })
}

/**
 * Mutation to update avvik status (for managers).
 */
export function useUpdateAvvikStatus() {
  return useSupabaseMutation<Avvik, UpdateAvvikStatusVariables>({
    mutationFn: ({ id, status, resolved_by }) =>
      supabase
        .from('avvik')
        .update({
          status,
          resolved_by: status === 'resolved' ? resolved_by : null,
          resolved_at: status === 'resolved' ? new Date().toISOString() : null,
        })
        .eq('id', id)
        .select()
        .single(),
    invalidateKeys: [avvikKeys.all],
  })
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parses a stored description into title and body.
 *
 * The description in the database is stored as "title\n\nbody".
 * If there is no double newline, the entire string is treated as the title.
 */
export function parseAvvikDescription(description: string): {
  title: string
  body: string
} {
  const idx = description.indexOf('\n\n')
  if (idx === -1) {
    return { title: description, body: '' }
  }
  return {
    title: description.slice(0, idx),
    body: description.slice(idx + 2),
  }
}
