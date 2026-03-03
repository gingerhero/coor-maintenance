import { z } from 'zod'

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const uuidSchema = z.string().uuid()

const dateSchema = z.string().date() // YYYY-MM-DD
const datetimeSchema = z.string().datetime() // ISO-8601 with timezone

// ---------------------------------------------------------------------------
// 1. Login
// ---------------------------------------------------------------------------

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export type LoginInput = z.infer<typeof loginSchema>

// ---------------------------------------------------------------------------
// 2. Profile update
// ---------------------------------------------------------------------------

export const profileUpdateSchema = z.object({
  full_name: z.string().min(2).max(100),
  phone: z
    .string()
    .regex(/^\+47\d{8}$/)
    .optional()
    .or(z.literal('')),
})

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>

// ---------------------------------------------------------------------------
// 3. Avvik (deviation) create
// ---------------------------------------------------------------------------

const avvikSeverity = z.enum(['low', 'medium', 'high'])

export const avvikCreateSchema = z.object({
  title: z.string().min(3, 'Tittel må ha minst 3 tegn').max(200),
  description: z.string().min(10, 'Beskrivelse må ha minst 10 tegn'),
  severity: avvikSeverity,
  ns3451_code: z.string().optional(),
  location: z.string().max(200).optional(),
})

export type AvvikCreateInput = z.infer<typeof avvikCreateSchema>

// ---------------------------------------------------------------------------
// 4. Avvik comment
// ---------------------------------------------------------------------------

export const avvikCommentSchema = z.object({
  body: z.string().min(1).max(2000),
  is_customer_visible: z.boolean(),
})

export type AvvikCommentInput = z.infer<typeof avvikCommentSchema>

// ---------------------------------------------------------------------------
// 5. Task execution
// ---------------------------------------------------------------------------

const skipReason = z.enum([
  'not_accessible',
  'not_necessary',
  'lacked_materials',
  'other',
])

export const taskExecutionSchema = z
  .object({
    status: z.enum(['done', 'skipped']),
    skip_reason: skipReason.optional(),
    note: z.string().max(500).optional(),
  })
  .refine(
    (data) => {
      if (data.status === 'skipped') {
        return data.skip_reason != null
      }
      return true
    },
    {
      path: ['skip_reason'],
      message: 'Skip reason is required when status is skipped',
    },
  )

export type TaskExecutionInput = z.infer<typeof taskExecutionSchema>

// ---------------------------------------------------------------------------
// 6. Time log
// ---------------------------------------------------------------------------

export const timeLogSchema = z
  .object({
    check_in_at: datetimeSchema,
    check_out_at: datetimeSchema,
    note: z.string().max(500).optional(),
  })
  .refine(
    (data) => new Date(data.check_out_at) > new Date(data.check_in_at),
    {
      path: ['check_out_at'],
      message: 'Check-out must be after check-in',
    },
  )

export type TimeLogInput = z.infer<typeof timeLogSchema>

// ---------------------------------------------------------------------------
// 7. Property create
// ---------------------------------------------------------------------------

export const propertyCreateSchema = z.object({
  name: z.string().min(2).max(100),
  address: z.string().min(5),
  center_lat: z.number().min(-90).max(90),
  center_lng: z.number().min(-180).max(180),
  estimated_weekly_hours: z.number().positive(),
  customer_id: uuidSchema,
})

export type PropertyCreateInput = z.infer<typeof propertyCreateSchema>

// ---------------------------------------------------------------------------
// 8. Instruction create
// ---------------------------------------------------------------------------

const frequencyType = z.enum([
  'weekly',
  'monthly',
  'quarterly',
  'yearly',
  'every_visit',
])

const seasonType = z.enum(['summer', 'winter', 'none'])

export const instructionCreateSchema = z.object({
  ns3451_code: z.string().min(1),
  activity_description: z.string().min(3).max(500),
  frequency_type: frequencyType,
  frequency_value: z.number().int().positive().optional(),
  season: seasonType.optional(),
  property_id: uuidSchema,
})

export type InstructionCreateInput = z.infer<typeof instructionCreateSchema>

// ---------------------------------------------------------------------------
// 8b. Instruction editor (extends create with additional fields)
// ---------------------------------------------------------------------------

export const instructionEditorSchema = instructionCreateSchema.extend({
  photo_required: z.boolean(),
  notify_board: z.boolean(),
  comment: z.string().max(500).optional().or(z.literal('')),
})

export type InstructionEditorInput = z.infer<typeof instructionEditorSchema>

// ---------------------------------------------------------------------------
// 9. Roster entry
// ---------------------------------------------------------------------------

const scheduleSchema = z.object({
  mon: z.boolean(),
  tue: z.boolean(),
  wed: z.boolean(),
  thu: z.boolean(),
  fri: z.boolean(),
  sat: z.boolean(),
  sun: z.boolean(),
})

export const rosterEntrySchema = z
  .object({
    janitor_id: uuidSchema,
    property_id: uuidSchema,
    budgeted_weekly_hours: z.number().positive().max(40),
    active_from: dateSchema,
    active_to: dateSchema.optional(),
    schedule: scheduleSchema,
  })
  .refine(
    (data) => {
      if (data.active_to != null) {
        return new Date(data.active_to) > new Date(data.active_from)
      }
      return true
    },
    {
      path: ['active_to'],
      message: 'End date must be after start date',
    },
  )

export type RosterEntryInput = z.infer<typeof rosterEntrySchema>

// ---------------------------------------------------------------------------
// 10. Absence report (replaces swap request)
// ---------------------------------------------------------------------------

const absenceType = z.enum(['sick', 'other'])

export const absenceReportSchema = z
  .object({
    absence_type: absenceType,
    reason: z.string().min(5, 'Årsak må ha minst 5 tegn').max(500),
    date_from: dateSchema,
    date_to: dateSchema,
  })
  .refine(
    (data) => new Date(data.date_to) >= new Date(data.date_from),
    {
      path: ['date_to'],
      message: 'Sluttdato må være etter startdato',
    },
  )

export type AbsenceReportInput = z.infer<typeof absenceReportSchema>
