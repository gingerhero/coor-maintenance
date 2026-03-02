export type UserRole = 'janitor' | 'manager' | 'admin' | 'customer'

export type FrequencyType = 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'every_visit'

export type SeasonType = 'summer' | 'winter' | 'none'

export type ExecutionStatus = 'done' | 'skipped'

export type SkipReason = 'not_accessible' | 'not_necessary' | 'lacked_materials' | 'other'

export type AvvikSeverity = 'low' | 'medium' | 'high'

export type AvvikStatus = 'new' | 'in_progress' | 'resolved'

export type AssignmentStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'

export type TimeLogStatus = 'draft' | 'submitted' | 'approved'

export type SwapStatus = 'pending' | 'approved' | 'rejected'

export interface Profile {
  id: string
  full_name: string
  email: string
  phone: string | null
  role: UserRole
  gps_consent_at: string | null
  photo_consent_at: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Property {
  id: string
  name: string
  address: string
  center_lat: number | null
  center_lng: number | null
  estimated_weekly_hours: number | null
  customer_id: string | null
  manager_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Customer {
  id: string
  organization_name: string
  contact_email: string | null
  phone: string | null
  notification_preferences: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface NS3451Code {
  id: string
  code: string
  parent_code: string | null
  title_nb: string
  title_en: string | null
  level: number
  is_high_risk: boolean
  created_at: string
}

export interface Instruction {
  id: string
  property_id: string
  ns3451_code: string
  description: string
  frequency_type: FrequencyType
  frequency_interval: number
  season: SeasonType
  comment: string | null
  photo_required: boolean
  notify_board: boolean
  version: number
  is_active: boolean
  published_at: string | null
  published_by: string | null
  created_at: string
  updated_at: string
}

export interface Assignment {
  id: string
  property_id: string
  scheduled_date: string
  scheduled_start: string | null
  scheduled_end: string | null
  status: AssignmentStatus
  checkin_at: string | null
  checkin_lat: number | null
  checkin_lng: number | null
  checkin_accuracy: number | null
  checkout_at: string | null
  checkout_lat: number | null
  checkout_lng: number | null
  checkout_accuracy: number | null
  actual_minutes: number | null
  checkin_note: string | null
  checkout_note: string | null
  instruction_version: number | null
  created_at: string
  updated_at: string
}

export interface TaskExecution {
  id: string
  assignment_id: string
  instruction_id: string
  janitor_id: string
  status: ExecutionStatus
  skip_reason: SkipReason | null
  skip_note: string | null
  gps_lat: number | null
  gps_lng: number | null
  gps_accuracy: number | null
  no_avvik_confirmed: boolean
  completed_at: string
  created_at: string
}

export interface Photo {
  id: string
  storage_path: string
  entity_type: 'task_execution' | 'avvik'
  entity_id: string
  gps_lat: number | null
  gps_lng: number | null
  uploaded_by: string | null
  uploaded_at: string
}

export interface Avvik {
  id: string
  property_id: string
  assignment_id: string | null
  instruction_id: string | null
  ns3451_code: string | null
  location_description: string | null
  description: string
  severity: AvvikSeverity
  status: AvvikStatus
  notify_board: boolean
  gps_lat: number | null
  gps_lng: number | null
  gps_accuracy: number | null
  reported_by: string
  resolved_by: string | null
  resolved_at: string | null
  board_notified_at: string | null
  created_at: string
  updated_at: string
}

export interface AvvikComment {
  id: string
  avvik_id: string
  author_id: string
  content: string
  is_visible_to_customer: boolean
  created_at: string
}

export interface TimeLog {
  id: string
  janitor_id: string
  property_id: string
  assignment_id: string | null
  date: string
  actual_minutes: number
  checkin_lat: number | null
  checkin_lng: number | null
  checkout_lat: number | null
  checkout_lng: number | null
  notes: string | null
  status: TimeLogStatus
  approved_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
}

export interface RosterEntry {
  id: string
  janitor_id: string
  property_id: string
  budgeted_weekly_hours: number | null
  schedule: Record<string, boolean>
  active_from: string
  active_to: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface SwapRequest {
  id: string
  from_janitor_id: string
  to_janitor_id: string | null
  assignment_id: string | null
  reason: string
  date_from: string
  date_to: string
  status: SwapStatus
  decided_by: string | null
  decided_at: string | null
  decision_note: string | null
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  recipient_id: string
  type: 'assignment' | 'avvik' | 'swap' | 'instruction_update'
  title: string
  body: string | null
  data: Record<string, unknown>
  read_at: string | null
  created_at: string
}
