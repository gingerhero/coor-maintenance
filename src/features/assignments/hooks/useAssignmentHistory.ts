import { supabase } from '@/lib/supabase'
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery'
import { useAuthStore } from '@/stores/authStore'
import type { Assignment, Property, TaskExecution, Instruction } from '@/types/database'

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const historyKeys = {
  all: ['assignments', 'history'] as const,
  list: (limit: number, offset: number) =>
    ['assignments', 'history', 'list', limit, offset] as const,
  detail: (id: string) => ['assignments', 'history', id] as const,
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HistoryAssignment = Assignment & {
  property: Pick<Property, 'id' | 'name' | 'address'>
  task_executions: Array<{ count: number }>
  avvik: Array<{ count: number }>
}

export type AssignmentDetailWithTasks = Assignment & {
  property: Pick<Property, 'id' | 'name' | 'address'>
  task_executions: Array<
    Pick<TaskExecution, 'id' | 'status' | 'skip_reason' | 'skip_note' | 'completed_at'> & {
      instruction: Pick<Instruction, 'id' | 'description'>
    }
  >
  avvik: Array<{ count: number }>
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Fetches completed assignments for the current janitor, ordered by
 * scheduled_date descending (most recent first).
 *
 * Joins through `assignment_janitors` to filter by the authenticated user,
 * and includes property info plus task/avvik counts for display.
 */
export function useAssignmentHistory(options?: { limit?: number; offset?: number }) {
  const limit = options?.limit ?? 50
  const offset = options?.offset ?? 0
  const userId = useAuthStore.getState().profile?.id

  return useSupabaseQuery(
    historyKeys.list(limit, offset),
    () =>
      supabase
        .from('assignments')
        .select(
          `
          *,
          property:properties(id, name, address),
          assignment_janitors!inner(janitor_id),
          task_executions(count),
          avvik(count)
          `,
        )
        .eq('assignment_janitors.janitor_id', userId!)
        .eq('status', 'completed')
        .order('scheduled_date', { ascending: false })
        .range(offset, offset + limit - 1)
        .returns<HistoryAssignment[]>(),
    { enabled: !!userId },
  )
}

/**
 * Fetches a single completed assignment with full detail:
 * - Property info (name, address)
 * - All task_executions with their instruction descriptions
 * - Avvik count
 */
export function useAssignmentDetail(assignmentId: string | undefined) {
  return useSupabaseQuery(
    historyKeys.detail(assignmentId ?? ''),
    () =>
      supabase
        .from('assignments')
        .select(
          `
          *,
          property:properties(id, name, address),
          task_executions(id, status, skip_reason, skip_note, completed_at, instruction:instructions(id, description)),
          avvik(count)
          `,
        )
        .eq('id', assignmentId!)
        .single()
        .returns<AssignmentDetailWithTasks>(),
    { enabled: !!assignmentId },
  )
}
