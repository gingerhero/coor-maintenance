import { supabase } from '@/lib/supabase'
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery'
import { useSupabaseMutation } from '@/hooks/useSupabaseMutation'
import { useAuthStore } from '@/stores/authStore'
import type { TaskExecution, SkipReason } from '@/types/database'

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const taskExecutionKeys = {
  all: ['task-executions'] as const,
  forAssignment: (assignmentId: string) =>
    ['task-executions', 'assignment', assignmentId] as const,
  forProperty: (propertyId: string) =>
    ['task-executions', 'property', propertyId] as const,
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TaskExecutionWithInstruction = TaskExecution & {
  instruction: {
    id: string
    description: string
    ns3451_code: string
    frequency_type: string
    frequency_interval: number
    season: string
  }
}

interface CompleteTaskVariables {
  assignment_id: string
  instruction_id: string
  gps_lat?: number
  gps_lng?: number
  gps_accuracy?: number
  no_avvik_confirmed: boolean
}

interface SkipTaskVariables {
  assignment_id: string
  instruction_id: string
  skip_reason: SkipReason
  skip_note?: string
  gps_lat?: number
  gps_lng?: number
  gps_accuracy?: number
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Fetches all task executions for a given assignment.
 *
 * Joins with `instructions` to include description and NS 3451 code,
 * which is needed for display in the checklist UI.
 */
export function useTaskExecutions(assignmentId: string | undefined) {
  return useSupabaseQuery(
    taskExecutionKeys.forAssignment(assignmentId ?? ''),
    () =>
      supabase
        .from('task_executions')
        .select(
          '*, instruction:instructions(id, description, ns3451_code, frequency_type, frequency_interval, season)',
        )
        .eq('assignment_id', assignmentId!)
        .order('completed_at', { ascending: false })
        .returns<TaskExecutionWithInstruction[]>(),
    { enabled: !!assignmentId },
  )
}

/**
 * Fetches the most recent task execution per instruction for a property.
 *
 * Used by the due-date engine to determine what's been done recently.
 * Looks back 365 days to cover yearly frequencies. Joins through
 * `assignments` to filter by property, then deduplicates in the caller
 * (the engine picks the latest per instruction_id).
 */
export function useExecutionHistory(propertyId: string | undefined) {
  const cutoffDate = new Date()
  cutoffDate.setFullYear(cutoffDate.getFullYear() - 1)
  const cutoff = cutoffDate.toISOString()

  return useSupabaseQuery(
    taskExecutionKeys.forProperty(propertyId ?? ''),
    () =>
      supabase
        .from('task_executions')
        .select(
          'instruction_id, completed_at, status, assignment:assignments!inner(property_id)',
        )
        .eq('assignment.property_id', propertyId!)
        .gte('completed_at', cutoff)
        .order('completed_at', { ascending: false })
        .returns<
          {
            instruction_id: string
            completed_at: string
            status: string
            assignment: { property_id: string }
          }[]
        >(),
    { enabled: !!propertyId },
  )
}

/**
 * Mutation to mark a task as completed (status = 'done').
 *
 * Automatically sets `janitor_id` from the auth store and `completed_at`
 * to the current timestamp. Invalidates all task execution queries so
 * that the checklist and execution history update immediately.
 */
export function useCompleteTask() {
  return useSupabaseMutation<TaskExecution, CompleteTaskVariables>({
    mutationFn: (variables) => {
      const janitorId = useAuthStore.getState().profile?.id
      if (!janitorId) {
        return Promise.reject(new Error('Bruker er ikke innlogget')) as never
      }

      return supabase
        .from('task_executions')
        .insert({
          assignment_id: variables.assignment_id,
          instruction_id: variables.instruction_id,
          janitor_id: janitorId,
          status: 'done' as const,
          gps_lat: variables.gps_lat ?? null,
          gps_lng: variables.gps_lng ?? null,
          gps_accuracy: variables.gps_accuracy ?? null,
          no_avvik_confirmed: variables.no_avvik_confirmed,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single()
    },
    invalidateKeys: [taskExecutionKeys.all],
  })
}

/**
 * Mutation to skip a task (status = 'skipped').
 *
 * Records the skip reason (and optional free-text note), GPS data,
 * and the janitor's identity. Invalidates task execution queries.
 */
export function useSkipTask() {
  return useSupabaseMutation<TaskExecution, SkipTaskVariables>({
    mutationFn: (variables) => {
      const janitorId = useAuthStore.getState().profile?.id
      if (!janitorId) {
        return Promise.reject(new Error('Bruker er ikke innlogget')) as never
      }

      return supabase
        .from('task_executions')
        .insert({
          assignment_id: variables.assignment_id,
          instruction_id: variables.instruction_id,
          janitor_id: janitorId,
          status: 'skipped' as const,
          skip_reason: variables.skip_reason,
          skip_note: variables.skip_note ?? null,
          gps_lat: variables.gps_lat ?? null,
          gps_lng: variables.gps_lng ?? null,
          gps_accuracy: variables.gps_accuracy ?? null,
          no_avvik_confirmed: false,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single()
    },
    invalidateKeys: [taskExecutionKeys.all],
  })
}
