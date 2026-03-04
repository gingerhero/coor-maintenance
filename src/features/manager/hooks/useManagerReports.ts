import { useQuery } from '@tanstack/react-query'
import { subDays, startOfDay, format } from 'date-fns'

import { supabase } from '@/lib/supabase'
import type {
  Avvik,
  AvvikSeverity,
  AvvikStatus,
  Instruction,
  Property,
  TimeLog,
  Photo,
} from '@/types/database'

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const reportKeys = {
  all: ['reports'] as const,
  completion: (propertyId?: string) =>
    ['reports', 'completion', propertyId ?? 'all'] as const,
  profitability: (dateRange: string) =>
    ['reports', 'profitability', dateRange] as const,
  avvikSummary: (dateRange: string) =>
    ['reports', 'avvikSummary', dateRange] as const,
  photos: (propertyId?: string) =>
    ['reports', 'photos', propertyId ?? 'all'] as const,
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DateRange = '7d' | '30d' | '90d'

export interface CompletionByCode {
  nsCode: string
  description: string
  total: number
  completed: number
  rate: number
}

export interface ProfitabilityRow {
  propertyId: string
  propertyName: string
  budgetedHours: number
  actualHours: number
  delta: number
  efficiency: number
}

export interface AvvikSummaryData {
  total: number
  bySeverity: Record<AvvikSeverity, number>
  byStatus: Record<AvvikStatus, number>
  byProperty: Array<{
    propertyId: string
    propertyName: string
    total: number
    low: number
    medium: number
    high: number
    open: number
    resolved: number
  }>
}

export interface PhotoItem {
  id: string
  storagePath: string
  entityType: 'task_execution' | 'avvik'
  uploadedAt: string
  propertyName: string
  propertyId: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDateBounds(dateRange: DateRange) {
  const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90
  const now = new Date()
  const from = startOfDay(subDays(now, days))
  return {
    days,
    from: format(from, 'yyyy-MM-dd'),
    to: format(now, 'yyyy-MM-dd'),
  }
}

// ---------------------------------------------------------------------------
// 1. Completion by NS 3451
// ---------------------------------------------------------------------------

type InstructionRow = Pick<Instruction, 'id' | 'ns3451_code' | 'description' | 'property_id'>

interface TaskExecCount {
  instruction_id: string
  status: string
}

export function useCompletionByNS3451(propertyId?: string) {
  return useQuery<CompletionByCode[], Error>({
    queryKey: reportKeys.completion(propertyId),
    queryFn: async () => {
      // Fetch active instructions
      let instrQuery = supabase
        .from('instructions')
        .select('id, ns3451_code, description, property_id')
        .eq('is_active', true)

      if (propertyId) {
        instrQuery = instrQuery.eq('property_id', propertyId)
      }

      const { data: instructions, error: instrError } =
        await instrQuery.returns<InstructionRow[]>()

      if (instrError) throw new Error(instrError.message)
      if (!instructions?.length) return []

      // Fetch task executions for these instructions
      const instrIds = instructions.map((i) => i.id)
      const { data: executions, error: execError } = await supabase
        .from('task_executions')
        .select('instruction_id, status')
        .in('instruction_id', instrIds)
        .returns<TaskExecCount[]>()

      if (execError) throw new Error(execError.message)

      // Group by NS 3451 code
      const codeMap = new Map<
        string,
        { description: string; total: number; completed: number }
      >()

      for (const instr of instructions) {
        const code = instr.ns3451_code ?? 'unknown'
        if (!codeMap.has(code)) {
          codeMap.set(code, {
            description: instr.description,
            total: 0,
            completed: 0,
          })
        }
      }

      // Count executions per NS code
      const instrCodeMap = new Map(
        instructions.map((i) => [i.id, i.ns3451_code ?? 'unknown']),
      )

      for (const exec of executions ?? []) {
        const code = instrCodeMap.get(exec.instruction_id)
        if (!code) continue
        const entry = codeMap.get(code)
        if (!entry) continue
        entry.total++
        if (exec.status === 'done') {
          entry.completed++
        }
      }

      return Array.from(codeMap.entries())
        .map(([nsCode, data]) => ({
          nsCode,
          description: data.description,
          total: data.total,
          completed: data.completed,
          rate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
        }))
        .sort((a, b) => a.nsCode.localeCompare(b.nsCode))
    },
    staleTime: 5 * 60 * 1000,
  })
}

// ---------------------------------------------------------------------------
// 2. Profitability report
// ---------------------------------------------------------------------------

export function useProfitabilityReport(dateRange: DateRange = '30d') {
  const { days, from, to } = getDateBounds(dateRange)

  return useQuery<ProfitabilityRow[], Error>({
    queryKey: reportKeys.profitability(dateRange),
    queryFn: async () => {
      const [propertiesResult, timeLogsResult] = await Promise.all([
        supabase
          .from('properties')
          .select('id, name, estimated_weekly_hours')
          .eq('is_active', true)
          .returns<Pick<Property, 'id' | 'name' | 'estimated_weekly_hours'>[]>(),
        supabase
          .from('time_logs')
          .select('property_id, actual_minutes')
          .gte('date', from)
          .lte('date', to)
          .returns<Pick<TimeLog, 'property_id' | 'actual_minutes'>[]>(),
      ])

      if (propertiesResult.error) throw new Error(propertiesResult.error.message)
      if (timeLogsResult.error) throw new Error(timeLogsResult.error.message)

      const weeks = days / 7

      // Sum actual minutes per property
      const actualMinutesMap = new Map<string, number>()
      for (const log of timeLogsResult.data ?? []) {
        const current = actualMinutesMap.get(log.property_id) ?? 0
        actualMinutesMap.set(log.property_id, current + (log.actual_minutes ?? 0))
      }

      return (propertiesResult.data ?? [])
        .map((property) => {
          const budgetedHours = Math.round(
            (property.estimated_weekly_hours ?? 0) * weeks * 10,
          ) / 10
          const actualHours = Math.round(
            ((actualMinutesMap.get(property.id) ?? 0) / 60) * 10,
          ) / 10
          const delta = Math.round((budgetedHours - actualHours) * 10) / 10
          const efficiency = budgetedHours > 0
            ? Math.round((actualHours / budgetedHours) * 100)
            : 0

          return {
            propertyId: property.id,
            propertyName: property.name,
            budgetedHours,
            actualHours,
            delta,
            efficiency,
          }
        })
        .sort((a, b) => a.propertyName.localeCompare(b.propertyName))
    },
    staleTime: 5 * 60 * 1000,
  })
}

// ---------------------------------------------------------------------------
// 3. Avvik summary
// ---------------------------------------------------------------------------

type AvvikRow = Pick<Avvik, 'id' | 'property_id' | 'severity' | 'status'> & {
  property: { name: string }
}

export function useAvvikSummary(dateRange: DateRange = '30d') {
  const { from, to } = getDateBounds(dateRange)

  return useQuery<AvvikSummaryData, Error>({
    queryKey: reportKeys.avvikSummary(dateRange),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('avvik')
        .select('id, property_id, severity, status, property:properties!avvik_property_id_fkey(name)')
        .gte('created_at', from)
        .lte('created_at', to)
        .returns<AvvikRow[]>()

      if (error) throw new Error(error.message)

      const avvik = data ?? []

      const bySeverity: Record<AvvikSeverity, number> = { low: 0, medium: 0, high: 0 }
      const byStatus: Record<AvvikStatus, number> = { new: 0, in_progress: 0, resolved: 0 }
      const propertyMap = new Map<
        string,
        { name: string; total: number; low: number; medium: number; high: number; open: number; resolved: number }
      >()

      for (const a of avvik) {
        bySeverity[a.severity]++
        byStatus[a.status]++

        if (!propertyMap.has(a.property_id)) {
          propertyMap.set(a.property_id, {
            name: (a.property as unknown as { name: string }).name,
            total: 0, low: 0, medium: 0, high: 0, open: 0, resolved: 0,
          })
        }
        const entry = propertyMap.get(a.property_id)!
        entry.total++
        entry[a.severity]++
        if (a.status === 'resolved') {
          entry.resolved++
        } else {
          entry.open++
        }
      }

      return {
        total: avvik.length,
        bySeverity,
        byStatus,
        byProperty: Array.from(propertyMap.entries())
          .map(([propertyId, data]) => ({
            propertyId,
            propertyName: data.name,
            ...data,
          }))
          .sort((a, b) => b.total - a.total),
      }
    },
    staleTime: 5 * 60 * 1000,
  })
}

// ---------------------------------------------------------------------------
// 4. Photo gallery
// ---------------------------------------------------------------------------

export function usePhotoGallery(propertyId?: string) {
  return useQuery<PhotoItem[], Error>({
    queryKey: reportKeys.photos(propertyId),
    queryFn: async () => {
      let query = supabase
        .from('photos')
        .select('id, storage_path, entity_type, uploaded_at, entity_id')
        .order('uploaded_at', { ascending: false })
        .limit(50)

      // We can't filter by property directly on photos table,
      // so we fetch all and could filter client-side if needed.
      // For now, return all recent photos.
      const { data: photos, error } = await query.returns<
        Pick<Photo, 'id' | 'storage_path' | 'entity_type' | 'uploaded_at' | 'entity_id'>[]
      >()

      if (error) throw new Error(error.message)
      if (!photos?.length) return []

      // Get avvik entity IDs to resolve property names
      const avvikIds = photos
        .filter((p) => p.entity_type === 'avvik')
        .map((p) => p.entity_id)

      // Get task_execution entity IDs
      const taskIds = photos
        .filter((p) => p.entity_type === 'task_execution')
        .map((p) => p.entity_id)

      // Resolve property names via avvik and task_executions
      const propertyNameMap = new Map<string, { propertyId: string; propertyName: string }>()

      if (avvikIds.length > 0) {
        const { data: avvikData } = await supabase
          .from('avvik')
          .select('id, property_id, property:properties!avvik_property_id_fkey(name)')
          .in('id', avvikIds)
          .returns<Array<{ id: string; property_id: string; property: { name: string } }>>()

        for (const a of avvikData ?? []) {
          propertyNameMap.set(a.id, {
            propertyId: a.property_id,
            propertyName: (a.property as unknown as { name: string }).name,
          })
        }
      }

      if (taskIds.length > 0) {
        const { data: taskData } = await supabase
          .from('task_executions')
          .select('id, assignment:assignments!task_executions_assignment_id_fkey(property_id, property:properties(name))')
          .in('id', taskIds)
          .returns<Array<{
            id: string
            assignment: { property_id: string; property: { name: string } }
          }>>()

        for (const te of taskData ?? []) {
          if (te.assignment) {
            propertyNameMap.set(te.id, {
              propertyId: te.assignment.property_id,
              propertyName: (te.assignment.property as unknown as { name: string }).name,
            })
          }
        }
      }

      const items: PhotoItem[] = photos.map((p) => {
        const resolved = propertyNameMap.get(p.entity_id)
        return {
          id: p.id,
          storagePath: p.storage_path,
          entityType: p.entity_type,
          uploadedAt: p.uploaded_at,
          propertyName: resolved?.propertyName ?? '',
          propertyId: resolved?.propertyId ?? '',
        }
      })

      // Filter by property if specified
      if (propertyId) {
        return items.filter((item) => item.propertyId === propertyId)
      }

      return items
    },
    staleTime: 5 * 60 * 1000,
  })
}
