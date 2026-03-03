import { supabase } from '@/lib/supabase'
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery'
import type { Avvik, AvvikSeverity, AvvikStatus } from '@/types/database'

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const managerAvvikKeys = {
  all: ['manager', 'avvik'] as const,
  filtered: (filters: AvvikInboxFilters) =>
    [
      'manager',
      'avvik',
      'filtered',
      filters.propertyId ?? '',
      filters.severity ?? '',
      filters.status ?? '',
      filters.ns3451Category ?? '',
      filters.dateFrom ?? '',
      filters.dateTo ?? '',
    ] as const,
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AvvikInboxFilters {
  propertyId?: string
  severity?: AvvikSeverity
  status?: AvvikStatus
  ns3451Category?: string
  dateFrom?: string
  dateTo?: string
}

export type AvvikInboxItem = Avvik & {
  reported_by_profile?: { full_name: string }
  property: { id: string; name: string }
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Fetches all avvik visible to the manager, with dynamic filtering.
 * Joins with `properties` for the property name and `profiles` for reporter.
 */
export function useAllManagerAvvik(filters: AvvikInboxFilters) {
  return useSupabaseQuery(
    managerAvvikKeys.filtered(filters),
    () => {
      let query = supabase
        .from('avvik')
        .select(
          '*, property:properties!avvik_property_id_fkey(id, name), reported_by_profile:profiles!avvik_reported_by_fkey(full_name)',
        )

      if (filters.propertyId) {
        query = query.eq('property_id', filters.propertyId)
      }

      if (filters.severity) {
        query = query.eq('severity', filters.severity)
      }

      if (filters.status) {
        query = query.eq('status', filters.status)
      }

      if (filters.ns3451Category) {
        query = query.like('ns3451_code', filters.ns3451Category + '%')
      }

      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom)
      }

      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo)
      }

      return query
        .order('created_at', { ascending: false })
        .returns<AvvikInboxItem[]>()
    },
    { staleTime: 60_000 },
  )
}
