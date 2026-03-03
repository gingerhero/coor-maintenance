import { supabase } from '@/lib/supabase'
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery'
import { useAuthStore } from '@/stores/authStore'
import type { RosterEntry, Property } from '@/types/database'

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const myRosterKeys = {
  current: (janitorId: string) => ['roster', 'my', janitorId] as const,
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RosterEntryWithProperty = RosterEntry & {
  property: Pick<Property, 'id' | 'name'>
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Fetches the current roster entries for the logged-in janitor.
 *
 * Only returns entries where `active_to` is null (currently active).
 * Each entry includes the related property name for display purposes.
 */
export function useMyCurrentRoster() {
  const profile = useAuthStore((s) => s.profile)
  const janitorId = profile?.id ?? ''

  return useSupabaseQuery(
    myRosterKeys.current(janitorId),
    () =>
      supabase
        .from('roster_entries')
        .select('*, property:properties!roster_entries_property_id_fkey(id, name)')
        .eq('janitor_id', janitorId!)
        .is('active_to', null)
        .order('active_from', { ascending: false })
        .returns<RosterEntryWithProperty[]>(),
    { enabled: !!janitorId },
  )
}
