import { supabase } from '@/lib/supabase'
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery'
import type { Property } from '@/types/database'

/**
 * Query key factory for property-related queries.
 * Using a factory keeps keys consistent across queries and invalidations.
 */
export const propertyKeys = {
  all: ['properties'] as const,
  detail: (id: string) => ['properties', id] as const,
}

/**
 * Fetches all properties visible to the current user.
 *
 * RLS policies on the `properties` table ensure that:
 * - Janitors see only properties they are assigned to via roster_entries
 * - Managers see properties they manage
 * - Admins see all properties
 * - Customers see their own properties
 *
 * Results are ordered alphabetically by name for the property list UI.
 */
export function useProperties() {
  return useSupabaseQuery(
    propertyKeys.all,
    () =>
      supabase
        .from('properties')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true })
        .returns<Property[]>(),
  )
}

/**
 * Fetches a single property by ID.
 *
 * Enabled only when an ID is provided, so it can be used safely with
 * route params that might not be available immediately.
 */
export function useProperty(id: string | undefined) {
  return useSupabaseQuery(
    propertyKeys.detail(id ?? ''),
    () =>
      supabase
        .from('properties')
        .select('*')
        .eq('id', id!)
        .single()
        .returns<Property>(),
    { enabled: !!id },
  )
}
