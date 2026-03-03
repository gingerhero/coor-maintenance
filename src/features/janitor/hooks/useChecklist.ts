import { useMemo } from 'react'
import type { TaskExecution } from '@/types/database'
import type { InstructionWithNS3451 } from '@/features/assignments/hooks/useInstructions'
import { usePropertyInstructions } from '@/features/assignments/hooks/useInstructions'
import {
  useTaskExecutions,
  useExecutionHistory,
} from '@/features/assignments/hooks/useTaskExecutions'
import {
  calculateDueTasks,
  getCurrentSeason,
  getFrequencyLabel,
  getSeasonLabel,
  type DueTask,
} from '@/lib/dueDateEngine'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChecklistItem {
  instruction: InstructionWithNS3451
  isDue: boolean
  isOverdue: boolean
  isCompleted: boolean
  isSkipped: boolean
  execution?: TaskExecution
  frequencyLabel: string
  seasonLabel: string
  reason: string
}

export interface ChecklistGroup {
  ns3451Code: string
  ns3451Title: string
  ns3451Level: number
  items: ChecklistItem[]
  completedCount: number
  totalCount: number
}

interface ChecklistResult {
  groups: ChecklistGroup[]
  totalTasks: number
  completedTasks: number
  isLoading: boolean
  error: Error | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extracts the top-level parent code from an NS 3451 code.
 *
 * NS 3451 codes are hierarchical (e.g. "32", "321", "321.1"). The top-level
 * parent is the first two characters, representing the main category.
 */
function getTopLevelCode(code: string): string {
  // Take the first two characters as the top-level group (e.g. "32" from "321.1")
  return code.substring(0, 2)
}

/**
 * Builds a ChecklistItem by combining a DueTask result with the current
 * assignment's execution records.
 */
function buildChecklistItem(
  dueTask: DueTask,
  executionsByInstruction: Map<string, TaskExecution>,
): ChecklistItem {
  const execution = executionsByInstruction.get(dueTask.instruction.id)

  return {
    instruction: dueTask.instruction,
    isDue: dueTask.isDue,
    isOverdue: dueTask.isOverdue,
    isCompleted: execution?.status === 'done',
    isSkipped: execution?.status === 'skipped',
    execution,
    frequencyLabel: getFrequencyLabel(dueTask.instruction),
    seasonLabel: getSeasonLabel(dueTask.instruction.season),
    reason: dueTask.reason,
  }
}

/**
 * Groups checklist items by their NS 3451 top-level parent code.
 * Each group includes completion counts for progress display.
 */
function groupByNS3451(items: ChecklistItem[]): ChecklistGroup[] {
  const groupMap = new Map<
    string,
    { code: string; title: string; level: number; items: ChecklistItem[] }
  >()

  for (const item of items) {
    const ns3451 = item.instruction.ns3451
    const topCode = getTopLevelCode(ns3451.code)

    let group = groupMap.get(topCode)
    if (!group) {
      // For items whose own code IS the top-level code, use that title.
      // Otherwise, fall back to the code itself as a label — the parent
      // title will be the same for all children in the group anyway, and
      // the first item we encounter is a reasonable representative.
      group = {
        code: topCode,
        title: ns3451.code.length <= 2 ? ns3451.title_nb : ns3451.title_nb,
        level: Math.min(ns3451.level, 2),
        items: [],
      }
      groupMap.set(topCode, group)
    }

    group.items.push(item)
  }

  // Sort groups by NS 3451 code (numeric order).
  const sorted = Array.from(groupMap.values()).sort((a, b) =>
    a.code.localeCompare(b.code, undefined, { numeric: true }),
  )

  return sorted.map(
    (g): ChecklistGroup => ({
      ns3451Code: g.code,
      ns3451Title: g.title,
      ns3451Level: g.level,
      items: g.items,
      completedCount: g.items.filter((i) => i.isCompleted || i.isSkipped)
        .length,
      totalCount: g.items.length,
    }),
  )
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * High-level hook that assembles the complete checklist for a visit.
 *
 * Combines:
 *  1. Property instructions (what should be done)
 *  2. Current assignment executions (what has been done this visit)
 *  3. Historical execution data (what was done previously)
 *  4. The due-date engine (which tasks are actually due today)
 *
 * Returns items grouped by NS 3451 top-level code, with completion counts
 * for progress indicators.
 */
export function useChecklist(
  assignmentId: string | undefined,
  propertyId: string | undefined,
): ChecklistResult {
  // 1. Get all active instructions for the property.
  const instructions = usePropertyInstructions(propertyId)

  // 2. Get task executions for the current assignment.
  const executions = useTaskExecutions(assignmentId)

  // 3. Get execution history for the property (due-date calculation).
  const history = useExecutionHistory(propertyId)

  // Derive loading / error states.
  const isLoading =
    instructions.isLoading || executions.isLoading || history.isLoading
  const error =
    instructions.error ?? executions.error ?? history.error ?? null

  // Build the checklist only when all data is available.
  const { groups, totalTasks, completedTasks } = useMemo(() => {
    if (!instructions.data || !executions.data || !history.data) {
      return { groups: [] as ChecklistGroup[], totalTasks: 0, completedTasks: 0 }
    }

    // Build execution lookup for the current assignment.
    const executionsByInstruction = new Map<string, TaskExecution>()
    for (const exec of executions.data) {
      // Keep the most recent execution per instruction if there are duplicates.
      const existing = executionsByInstruction.get(exec.instruction_id)
      if (
        !existing ||
        new Date(exec.completed_at) > new Date(existing.completed_at)
      ) {
        executionsByInstruction.set(exec.instruction_id, exec)
      }
    }

    // Flatten execution history into the shape the engine expects.
    const executionHistory = history.data.map((h) => ({
      instruction_id: h.instruction_id,
      completed_at: h.completed_at,
      status: h.status,
    }))

    // Run the due-date engine.
    const visitDate = new Date()
    const currentSeason = getCurrentSeason(visitDate)

    const dueTasks = calculateDueTasks({
      visitDate,
      instructions: instructions.data,
      executionHistory,
      currentSeason,
    })

    // Include all instructions so the janitor sees the full checklist.
    // The due-date engine info is kept for display purposes (badges, etc.)
    // but does not hide tasks from the list.
    const allItems = dueTasks.map((dt) =>
      buildChecklistItem(dt, executionsByInstruction),
    )

    // Group by NS 3451 top-level code.
    const groups = groupByNS3451(allItems)

    const totalTasks = allItems.length
    const completedTasks = allItems.filter(
      (i) => i.isCompleted || i.isSkipped,
    ).length

    return { groups, totalTasks, completedTasks }
  }, [instructions.data, executions.data, history.data])

  return {
    groups,
    totalTasks,
    completedTasks,
    isLoading,
    error,
  }
}
