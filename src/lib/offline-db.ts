import Dexie, { type Table } from 'dexie'

import type {
  Property,
  Assignment,
  Instruction,
  TaskExecution,
  Avvik,
  Photo,
  TimeLog,
  NS3451Code,
} from '@/types/database'

// ---------------------------------------------------------------------------
// Sync queue item — stored alongside domain data in the same IndexedDB
// ---------------------------------------------------------------------------
export interface SyncQueueItem {
  id: string
  table: string
  operation: 'insert' | 'update' | 'delete'
  payload: Record<string, unknown>
  createdAt: string
  retries: number
  lastError?: string
}

// ---------------------------------------------------------------------------
// Offline-first Dexie database
// ---------------------------------------------------------------------------
class CoorOfflineDB extends Dexie {
  // Domain tables (read-cache of Supabase data)
  properties!: Table<Property, string>
  assignments!: Table<Assignment, string>
  instructions!: Table<Instruction, string>
  taskExecutions!: Table<TaskExecution, string>
  avvik!: Table<Avvik, string>
  photos!: Table<Photo, string>
  timeLogs!: Table<TimeLog, string>
  ns3451Codes!: Table<NS3451Code, string>

  // Mutation queue for offline writes
  syncQueue!: Table<SyncQueueItem, string>

  constructor() {
    super('coor-maintenance-offline')

    this.version(1).stores({
      // ---- Domain tables ----
      // Primary key listed first, then commonly queried indexes.

      properties: 'id, name, customer_id, manager_id, is_active',

      assignments:
        'id, property_id, scheduled_date, status, [property_id+scheduled_date]',

      instructions:
        'id, property_id, ns3451_code, frequency_type, is_active, [property_id+is_active]',

      taskExecutions:
        'id, assignment_id, instruction_id, janitor_id, status, completed_at, [assignment_id+instruction_id]',

      avvik: 'id, property_id, assignment_id, severity, status, reported_by, created_at',

      photos: 'id, entity_type, entity_id, [entity_type+entity_id]',

      timeLogs:
        'id, janitor_id, property_id, assignment_id, date, status, [janitor_id+date]',

      ns3451Codes: 'id, code, parent_code, level, is_high_risk',

      // ---- Sync queue ----
      syncQueue: 'id, table, createdAt, retries',
    })
  }
}

// ---------------------------------------------------------------------------
// Singleton instance
// ---------------------------------------------------------------------------
export const db = new CoorOfflineDB()
