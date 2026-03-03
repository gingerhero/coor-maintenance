import { supabase } from '@/lib/supabase'
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery'
import { useSupabaseMutation } from '@/hooks/useSupabaseMutation'
import type { SwapRequest, SwapStatus, Profile } from '@/types/database'

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const swapKeys = {
  all: ['swap-requests'] as const,
  filtered: (status?: SwapStatus) =>
    ['swap-requests', status ?? 'all'] as const,
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SwapRequestWithProfiles = SwapRequest & {
  from_janitor: Pick<Profile, 'id' | 'full_name'>
  to_janitor: Pick<Profile, 'id' | 'full_name'> | null
}

interface ApproveSwapRequestVars {
  id: string
  decided_by: string
  decision_note?: string
  to_janitor_id?: string
}

interface RejectSwapRequestVars {
  id: string
  decided_by: string
  decision_note?: string
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Fetches swap requests with from/to janitor profiles joined.
 * Optionally filtered by status.
 */
export function useSwapRequests(status?: SwapStatus) {
  return useSupabaseQuery(
    swapKeys.filtered(status),
    () => {
      let query = supabase
        .from('swap_requests')
        .select(
          '*, from_janitor:profiles!swap_requests_from_janitor_id_fkey(id, full_name), to_janitor:profiles!swap_requests_to_janitor_id_fkey(id, full_name)',
        )

      if (status) {
        query = query.eq('status', status)
      }

      return query
        .order('created_at', { ascending: false })
        .returns<SwapRequestWithProfiles[]>()
    },
  )
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Approves a pending swap request.
 */
export function useApproveSwapRequest() {
  return useSupabaseMutation<SwapRequest, ApproveSwapRequestVars>({
    mutationFn: ({ id, decided_by, decision_note, to_janitor_id }) =>
      supabase
        .from('swap_requests')
        .update({
          status: 'approved',
          decided_by,
          decided_at: new Date().toISOString(),
          decision_note: decision_note ?? null,
          to_janitor_id: to_janitor_id ?? null,
        })
        .eq('id', id)
        .select()
        .single(),
    invalidateKeys: [swapKeys.all],
  })
}

/**
 * Rejects a pending swap request.
 */
export function useRejectSwapRequest() {
  return useSupabaseMutation<SwapRequest, RejectSwapRequestVars>({
    mutationFn: ({ id, decided_by, decision_note }) =>
      supabase
        .from('swap_requests')
        .update({
          status: 'rejected',
          decided_by,
          decided_at: new Date().toISOString(),
          decision_note: decision_note ?? null,
        })
        .eq('id', id)
        .select()
        .single(),
    invalidateKeys: [swapKeys.all],
  })
}
