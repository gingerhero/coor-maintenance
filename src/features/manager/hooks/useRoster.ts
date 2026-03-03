import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery'
import { useSupabaseMutation } from '@/hooks/useSupabaseMutation'
import type { RosterEntry, Profile } from '@/types/database'

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const rosterKeys = {
  all: ['roster'] as const,
  forProperty: (propertyId: string) =>
    ['roster', 'property', propertyId] as const,
  janitors: ['roster', 'janitors'] as const,
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RosterEntryWithJanitor = RosterEntry & {
  janitor: Pick<Profile, 'id' | 'full_name' | 'email' | 'phone'>
}

interface CreateRosterEntryVars {
  janitor_id: string
  property_id: string
  budgeted_weekly_hours: number
  schedule: Record<string, boolean>
  active_from: string
  active_to?: string
  notes?: string
}

interface UpdateRosterEntryVars {
  id: string
  property_id: string
  budgeted_weekly_hours?: number
  schedule?: Record<string, boolean>
  active_from?: string
  active_to?: string
  notes?: string
}

interface DeactivateRosterEntryVars {
  id: string
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Fetches roster entries for a specific property, with janitor profile joined.
 */
export function useRosterEntries(propertyId: string | undefined) {
  return useSupabaseQuery(
    rosterKeys.forProperty(propertyId ?? ''),
    () =>
      supabase
        .from('roster_entries')
        .select(
          '*, janitor:profiles!roster_entries_janitor_id_fkey(id, full_name, email, phone)',
        )
        .eq('property_id', propertyId!)
        .order('active_from', { ascending: false })
        .returns<RosterEntryWithJanitor[]>(),
    { enabled: !!propertyId },
  )
}

/**
 * Fetches all active janitors for assignment dropdowns.
 */
export function useAllJanitors() {
  return useSupabaseQuery(
    rosterKeys.janitors,
    () =>
      supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'janitor')
        .eq('is_active', true)
        .order('full_name')
        .returns<Pick<Profile, 'id' | 'full_name' | 'email'>[]>(),
    { staleTime: 5 * 60 * 1000 },
  )
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Creates a new roster entry assigning a janitor to a property.
 */
export function useCreateRosterEntry() {
  return useSupabaseMutation<RosterEntry, CreateRosterEntryVars>({
    mutationFn: (vars) =>
      supabase
        .from('roster_entries')
        .insert({
          janitor_id: vars.janitor_id,
          property_id: vars.property_id,
          budgeted_weekly_hours: vars.budgeted_weekly_hours,
          schedule: vars.schedule,
          active_from: vars.active_from,
          active_to: vars.active_to ?? null,
          notes: vars.notes ?? null,
        })
        .select()
        .single(),
    invalidateKeys: [rosterKeys.all],
  })
}

/**
 * Updates an existing roster entry.
 */
export function useUpdateRosterEntry() {
  return useSupabaseMutation<RosterEntry, UpdateRosterEntryVars>({
    mutationFn: ({ id, property_id: _propertyId, ...fields }) =>
      supabase
        .from('roster_entries')
        .update(fields)
        .eq('id', id)
        .select()
        .single(),
    invalidateKeys: [rosterKeys.all],
  })
}

/**
 * Deactivates a roster entry by setting active_to to today.
 */
export function useDeactivateRosterEntry() {
  return useSupabaseMutation<RosterEntry, DeactivateRosterEntryVars>({
    mutationFn: ({ id }) =>
      supabase
        .from('roster_entries')
        .update({ active_to: format(new Date(), 'yyyy-MM-dd') })
        .eq('id', id)
        .select()
        .single(),
    invalidateKeys: [rosterKeys.all],
  })
}
