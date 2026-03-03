import { supabase } from '@/lib/supabase'
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery'
import { useSupabaseMutation } from '@/hooks/useSupabaseMutation'
import { useAuthStore } from '@/stores/authStore'
import type { SwapRequest, AbsenceType, Profile } from '@/types/database'

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const absenceKeys = {
  all: ['swap-requests'] as const,
  my: (janitorId: string) => ['swap-requests', 'my', janitorId] as const,
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CreateAbsenceReportVars {
  from_janitor_id: string
  absence_type: AbsenceType
  reason: string
  date_from: string
  date_to: string
}

export type AbsenceReportRow = SwapRequest & {
  from_janitor: Pick<Profile, 'id' | 'full_name'>
  to_janitor: Pick<Profile, 'id' | 'full_name'> | null
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Fetches the logged-in janitor's own absence reports.
 */
export function useMyAbsenceReports() {
  const profile = useAuthStore((s) => s.profile)
  const janitorId = profile?.id ?? ''

  return useSupabaseQuery(
    absenceKeys.my(janitorId),
    () =>
      supabase
        .from('swap_requests')
        .select(
          '*, from_janitor:profiles!swap_requests_from_janitor_id_fkey(id, full_name), to_janitor:profiles!swap_requests_to_janitor_id_fkey(id, full_name)',
        )
        .eq('from_janitor_id', janitorId)
        .order('created_at', { ascending: false })
        .returns<AbsenceReportRow[]>(),
    { enabled: !!janitorId },
  )
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Creates a new absence report from the janitor side.
 */
export function useCreateAbsenceReport() {
  return useSupabaseMutation<SwapRequest, CreateAbsenceReportVars>({
    mutationFn: (vars) =>
      supabase
        .from('swap_requests')
        .insert({
          from_janitor_id: vars.from_janitor_id,
          absence_type: vars.absence_type,
          reason: vars.reason,
          date_from: vars.date_from,
          date_to: vars.date_to,
          status: 'pending',
        })
        .select()
        .single(),
    invalidateKeys: [absenceKeys.all],
  })
}
