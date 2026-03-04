import { supabase } from '@/lib/supabase'
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery'
import type { Avvik, AvvikComment } from '@/types/database'

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const customerKeys = {
  avvik: (propertyId?: string) =>
    ['customer', 'avvik', propertyId ?? 'all'] as const,
  avvikComments: (avvikId: string) =>
    ['customer', 'avvik-comments', avvikId] as const,
  avvikCounts: ['customer', 'avvik-counts'] as const,
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CustomerAvvikItem = Avvik & {
  reported_by_profile?: { full_name: string }
  property: { id: string; name: string }
}

export type CustomerComment = AvvikComment & {
  author_profile?: { full_name: string }
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Fetches all avvik visible to the customer, optionally filtered by property.
 * RLS automatically restricts to avvik on properties linked to the customer's org.
 */
export function useCustomerAvvik(propertyId?: string) {
  return useSupabaseQuery(
    customerKeys.avvik(propertyId),
    () => {
      let query = supabase
        .from('avvik')
        .select(
          '*, reported_by_profile:profiles!avvik_reported_by_fkey(full_name), property:properties!avvik_property_id_fkey(id, name)',
        )

      if (propertyId) {
        query = query.eq('property_id', propertyId)
      }

      return query
        .order('created_at', { ascending: false })
        .returns<CustomerAvvikItem[]>()
    },
  )
}

/**
 * Fetches avvik counts per property for the dashboard cards.
 * RLS auto-filters to customer's properties.
 */
export function useCustomerAvvikCounts() {
  return useSupabaseQuery(
    customerKeys.avvikCounts,
    () =>
      supabase
        .from('avvik')
        .select('property_id, status')
        .neq('status', 'resolved')
        .returns<Array<{ property_id: string; status: string }>>(),
  )
}

/**
 * Fetches customer-visible comments for a specific avvik.
 * RLS ensures only comments with is_visible_to_customer = true are returned.
 */
export function useCustomerAvvikComments(avvikId: string | undefined) {
  return useSupabaseQuery(
    customerKeys.avvikComments(avvikId ?? ''),
    () =>
      supabase
        .from('avvik_comments')
        .select('*, author_profile:profiles!avvik_comments_author_id_fkey(full_name)')
        .eq('avvik_id', avvikId!)
        .order('created_at', { ascending: true })
        .returns<CustomerComment[]>(),
    { enabled: !!avvikId },
  )
}
