import { useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import type { AssignmentStatus, Property } from '@/types/database'
import { managerKeys } from './useManagerDashboard'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PropertyWithStats = Property & {
  lastVisitDate: string | null
  lastVisitStatus: AssignmentStatus | null
  openAvvikCount: number
  completedVisits: number
  totalVisits: number
  assignedJanitors: Array<{ id: string; full_name: string }>
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Fetches all active properties enriched with dashboard stats:
 * - last visit date & status
 * - open avvik count
 * - completed / total visit counts
 * - assigned janitors (from roster)
 *
 * Uses `useQuery` directly to orchestrate multiple Supabase calls.
 */
export function useManagerPropertyList() {
  return useQuery<PropertyWithStats[], Error>({
    queryKey: managerKeys.properties,
    queryFn: async () => {
      // 1. Fetch all active properties
      const { data: properties, error: propertiesError } = await supabase
        .from('properties')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true })
        .returns<Property[]>()

      if (propertiesError) throw new Error(propertiesError.message)
      if (!properties?.length) return []

      const propertyIds = properties.map((p) => p.id)

      // 2. Fetch all assignments for these properties (parallel queries)
      const [assignmentsResult, avvikResult, rosterResult] = await Promise.all([
        supabase
          .from('assignments')
          .select('id, property_id, status, scheduled_date')
          .in('property_id', propertyIds)
          .order('scheduled_date', { ascending: false })
          .returns<
            Array<{
              id: string
              property_id: string
              status: AssignmentStatus
              scheduled_date: string
            }>
          >(),

        // Open avvik per property
        supabase
          .from('avvik')
          .select('id, property_id')
          .in('property_id', propertyIds)
          .neq('status', 'resolved')
          .returns<Array<{ id: string; property_id: string }>>(),

        // Active roster entries with janitor profile names
        supabase
          .from('roster_entries')
          .select('property_id, janitor_id, janitor:profiles!roster_entries_janitor_id_fkey(id, full_name)')
          .in('property_id', propertyIds)
          .is('active_to', null)
          .returns<
            Array<{
              property_id: string
              janitor_id: string
              janitor: { id: string; full_name: string }
            }>
          >(),
      ])

      if (assignmentsResult.error) throw new Error(assignmentsResult.error.message)
      if (avvikResult.error) throw new Error(avvikResult.error.message)
      if (rosterResult.error) throw new Error(rosterResult.error.message)

      const assignments = assignmentsResult.data ?? []
      const avvik = avvikResult.data ?? []
      const roster = rosterResult.data ?? []

      // --- Build lookup maps ---

      // Group assignments by property
      const assignmentsByProperty = new Map<
        string,
        typeof assignments
      >()
      for (const a of assignments) {
        const group = assignmentsByProperty.get(a.property_id) ?? []
        group.push(a)
        assignmentsByProperty.set(a.property_id, group)
      }

      // Count open avvik per property
      const avvikCountByProperty = new Map<string, number>()
      for (const a of avvik) {
        avvikCountByProperty.set(
          a.property_id,
          (avvikCountByProperty.get(a.property_id) ?? 0) + 1,
        )
      }

      // Group janitors by property (deduplicated)
      const janitorsByProperty = new Map<
        string,
        Array<{ id: string; full_name: string }>
      >()
      for (const r of roster) {
        const group = janitorsByProperty.get(r.property_id) ?? []
        // Avoid duplicates
        if (!group.some((j) => j.id === r.janitor.id)) {
          group.push({ id: r.janitor.id, full_name: r.janitor.full_name })
        }
        janitorsByProperty.set(r.property_id, group)
      }

      // --- Enrich properties ---
      return properties.map((property): PropertyWithStats => {
        const propAssignments = assignmentsByProperty.get(property.id) ?? []
        const lastAssignment = propAssignments[0] ?? null // already sorted desc

        return {
          ...property,
          lastVisitDate: lastAssignment?.scheduled_date ?? null,
          lastVisitStatus: lastAssignment?.status ?? null,
          openAvvikCount: avvikCountByProperty.get(property.id) ?? 0,
          completedVisits: propAssignments.filter(
            (a) => a.status === 'completed',
          ).length,
          totalVisits: propAssignments.length,
          assignedJanitors: janitorsByProperty.get(property.id) ?? [],
        }
      })
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
