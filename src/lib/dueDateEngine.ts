import {
  differenceInDays,
  addDays,
  addMonths,
  addYears,
  isAfter,
  isBefore,
  startOfDay,
  getMonth,
  parseISO,
} from 'date-fns'
import type { Instruction, FrequencyType, SeasonType } from '@/types/database'
import type { InstructionWithNS3451 } from '@/features/assignments/hooks/useInstructions'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DueTask {
  instruction: InstructionWithNS3451
  isDue: boolean
  isOverdue: boolean
  lastCompleted: string | null
  nextDue: string | null
  reason: string
}

export interface ExecutionRecord {
  instruction_id: string
  completed_at: string
  status: string
}

export interface DueDateOptions {
  visitDate: Date
  instructions: InstructionWithNS3451[]
  executionHistory: ExecutionRecord[]
  currentSeason: 'summer' | 'winter' | 'none'
}

// ---------------------------------------------------------------------------
// Season helpers
// ---------------------------------------------------------------------------

/**
 * Determines the current season based on Norwegian climate conventions.
 * May through September (months 4-8, zero-indexed) = summer.
 * October through April = winter.
 */
export function getCurrentSeason(date: Date): 'summer' | 'winter' {
  const month = getMonth(date) // 0-indexed: 0 = January
  return month >= 4 && month <= 8 ? 'summer' : 'winter'
}

/**
 * Returns a Norwegian label for a season type.
 */
export function getSeasonLabel(season: string): string {
  switch (season) {
    case 'summer':
      return 'Sommer'
    case 'winter':
      return 'Vinter'
    case 'none':
    default:
      return 'Hele året'
  }
}

// ---------------------------------------------------------------------------
// Frequency helpers
// ---------------------------------------------------------------------------

/**
 * Returns a Norwegian label for an instruction's frequency type.
 */
export function getFrequencyLabel(instruction: Instruction): string {
  const { frequency_type, frequency_interval } = instruction

  switch (frequency_type) {
    case 'every_visit':
      return 'Hver gang'
    case 'weekly':
      return frequency_interval === 1
        ? 'Ukentlig'
        : `Hver ${frequency_interval}. uke`
    case 'monthly':
      return frequency_interval === 1
        ? 'Månedlig'
        : `Hver ${frequency_interval}. måned`
    case 'quarterly':
      return frequency_interval === 1
        ? 'Kvartalsvis'
        : `Hvert ${frequency_interval}. kvartal`
    case 'yearly':
      return frequency_interval === 1
        ? 'Årlig'
        : `Hvert ${frequency_interval}. år`
    default:
      return frequency_type
  }
}

// ---------------------------------------------------------------------------
// Internal: interval calculation
// ---------------------------------------------------------------------------

/**
 * Returns the number of days that define one full cycle for the given frequency.
 */
function getIntervalDays(
  frequencyType: FrequencyType,
  frequencyInterval: number,
): number {
  switch (frequencyType) {
    case 'every_visit':
      return 0
    case 'weekly':
      return 7 * frequencyInterval
    case 'monthly':
      return 30 * frequencyInterval
    case 'quarterly':
      return 90 * frequencyInterval
    case 'yearly':
      return 365 * frequencyInterval
    default:
      return 0
  }
}

/**
 * Calculates the next-due date by adding the appropriate calendar interval to
 * the last-completed date.
 *
 * Uses calendar-aware date-fns functions (addMonths, addYears) rather than
 * flat day counts so that "monthly" actually means the same calendar day
 * next month, etc. Falls back to `addDays` for weekly.
 */
function calculateNextDueDate(
  lastCompleted: Date,
  frequencyType: FrequencyType,
  frequencyInterval: number,
): Date {
  switch (frequencyType) {
    case 'every_visit':
      // Always due — there is no meaningful "next" date.
      return lastCompleted
    case 'weekly':
      return addDays(lastCompleted, 7 * frequencyInterval)
    case 'monthly':
      return addMonths(lastCompleted, frequencyInterval)
    case 'quarterly':
      return addMonths(lastCompleted, 3 * frequencyInterval)
    case 'yearly':
      return addYears(lastCompleted, frequencyInterval)
    default:
      return lastCompleted
  }
}

// ---------------------------------------------------------------------------
// Internal: season check
// ---------------------------------------------------------------------------

/**
 * Checks whether an instruction is applicable in the given season.
 * Instructions with season === 'none' are always applicable.
 */
function isInSeason(
  instructionSeason: SeasonType,
  currentSeason: 'summer' | 'winter' | 'none',
): boolean {
  if (instructionSeason === 'none' || currentSeason === 'none') {
    return true
  }
  return instructionSeason === currentSeason
}

// ---------------------------------------------------------------------------
// Core engine
// ---------------------------------------------------------------------------

/**
 * Determines which tasks are due on a given visit date.
 *
 * For each active instruction, the engine:
 *  1. Filters out instructions that are out of season.
 *  2. Finds the most recent completed execution from the history.
 *  3. Calculates the next-due date based on the frequency and interval.
 *  4. Marks the task as due if the visit date is on or after the next-due date.
 *  5. Marks the task as overdue if it was due before the visit date.
 *
 * `every_visit` tasks are always due and never overdue.
 */
export function calculateDueTasks(options: DueDateOptions): DueTask[] {
  const { visitDate, instructions, executionHistory, currentSeason } = options
  const visitDay = startOfDay(visitDate)

  // Build a lookup: instruction_id -> most recent completed execution date.
  const lastCompletedMap = new Map<string, Date>()

  for (const exec of executionHistory) {
    if (exec.status !== 'done') continue

    const completedDate = parseISO(exec.completed_at)
    const existing = lastCompletedMap.get(exec.instruction_id)

    if (!existing || isAfter(completedDate, existing)) {
      lastCompletedMap.set(exec.instruction_id, completedDate)
    }
  }

  return instructions.map((instruction): DueTask => {
    const lastCompletedDate = lastCompletedMap.get(instruction.id) ?? null
    const lastCompletedISO = lastCompletedDate
      ? lastCompletedDate.toISOString()
      : null

    // ------------------------------------------------------------------
    // Season filter
    // ------------------------------------------------------------------
    if (!isInSeason(instruction.season, currentSeason)) {
      return {
        instruction,
        isDue: false,
        isOverdue: false,
        lastCompleted: lastCompletedISO,
        nextDue: null,
        reason: `Ikke i sesong (${getSeasonLabel(instruction.season)})`,
      }
    }

    // ------------------------------------------------------------------
    // every_visit — always due
    // ------------------------------------------------------------------
    if (instruction.frequency_type === 'every_visit') {
      return {
        instruction,
        isDue: true,
        isOverdue: false,
        lastCompleted: lastCompletedISO,
        nextDue: visitDay.toISOString(),
        reason: 'Hver gang',
      }
    }

    // ------------------------------------------------------------------
    // Frequency-based scheduling
    // ------------------------------------------------------------------
    const intervalDays = getIntervalDays(
      instruction.frequency_type,
      instruction.frequency_interval,
    )

    // If never completed before, it's due now.
    if (!lastCompletedDate) {
      return {
        instruction,
        isDue: true,
        isOverdue: true,
        lastCompleted: null,
        nextDue: null, // unknown — never been done
        reason: `${getFrequencyLabel(instruction)} (aldri utført)`,
      }
    }

    const nextDueDate = calculateNextDueDate(
      startOfDay(lastCompletedDate),
      instruction.frequency_type,
      instruction.frequency_interval,
    )
    const nextDueISO = nextDueDate.toISOString()

    const daysSinceLastCompleted = differenceInDays(visitDay, startOfDay(lastCompletedDate))
    const isDue = daysSinceLastCompleted >= intervalDays
    const isOverdue = isBefore(nextDueDate, visitDay) && isDue

    // Build a human-readable Norwegian reason.
    const reason = buildReason(
      instruction.frequency_type,
      instruction.frequency_interval,
      daysSinceLastCompleted,
      isDue,
    )

    return {
      instruction,
      isDue,
      isOverdue,
      lastCompleted: lastCompletedISO,
      nextDue: nextDueISO,
      reason,
    }
  })
}

// ---------------------------------------------------------------------------
// Reason string builder (Norwegian)
// ---------------------------------------------------------------------------

function buildReason(
  frequencyType: FrequencyType,
  interval: number,
  daysSince: number,
  isDue: boolean,
): string {
  const frequencyLabels: Record<FrequencyType, string> = {
    every_visit: 'Hver gang',
    weekly: 'Ukentlig',
    monthly: 'Månedlig',
    quarterly: 'Kvartalsvis',
    yearly: 'Årlig',
  }

  const label = frequencyLabels[frequencyType]

  if (!isDue) {
    return `${label} (${daysSince}d siden sist)`
  }

  if (interval === 1) {
    return label
  }

  switch (frequencyType) {
    case 'weekly':
      return `Hver ${interval}. uke`
    case 'monthly':
      return `Hver ${interval}. måned`
    case 'quarterly':
      return `Hvert ${interval}. kvartal`
    case 'yearly':
      return `Hvert ${interval}. år`
    default:
      return label
  }
}
