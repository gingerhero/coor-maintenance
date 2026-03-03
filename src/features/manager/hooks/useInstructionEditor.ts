import { supabase } from '@/lib/supabase'
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery'
import { useSupabaseMutation } from '@/hooks/useSupabaseMutation'
import { useAuthStore } from '@/stores/authStore'
import type { Instruction } from '@/types/database'
import {
  instructionKeys,
  type InstructionWithNS3451,
} from '@/features/assignments/hooks/useInstructions'

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const instructionEditorKeys = {
  all: ['instructions', 'editor'] as const,
  forProperty: (propertyId: string) =>
    ['instructions', 'editor', propertyId] as const,
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Fetches ALL instructions for a property (active + inactive).
 *
 * Unlike `usePropertyInstructions` which filters `is_active: true`,
 * this version returns every instruction so the editor can display
 * and manage deactivated items.
 */
export function usePropertyInstructionsAll(propertyId: string | undefined) {
  return useSupabaseQuery(
    instructionEditorKeys.forProperty(propertyId ?? ''),
    () =>
      supabase
        .from('instructions')
        .select('*, ns3451:ns3451_codes(code, title_nb, title_en, level, is_high_risk)')
        .eq('property_id', propertyId!)
        .order('ns3451_code')
        .returns<InstructionWithNS3451[]>(),
    { enabled: !!propertyId },
  )
}

// ---------------------------------------------------------------------------
// Mutation variable types
// ---------------------------------------------------------------------------

interface CreateInstructionVars {
  property_id: string
  ns3451_code: string
  description: string
  frequency_type: string
  frequency_interval: number
  season: string
  photo_required: boolean
  notify_board: boolean
  comment?: string
}

interface UpdateInstructionVars {
  id: string
  property_id: string
  ns3451_code?: string
  description?: string
  frequency_type?: string
  frequency_interval?: number
  season?: string
  photo_required?: boolean
  notify_board?: boolean
  comment?: string
}

interface DeactivateInstructionVars {
  id: string
  property_id: string
}

interface PublishInstructionVars {
  id: string
  property_id: string
  currentVersion: number
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Creates a new instruction for a property.
 */
export function useCreateInstruction() {
  return useSupabaseMutation<Instruction, CreateInstructionVars>({
    mutationFn: (vars) =>
      supabase
        .from('instructions')
        .insert({
          property_id: vars.property_id,
          ns3451_code: vars.ns3451_code,
          description: vars.description,
          frequency_type: vars.frequency_type,
          frequency_interval: vars.frequency_interval,
          season: vars.season,
          photo_required: vars.photo_required,
          notify_board: vars.notify_board,
          comment: vars.comment ?? null,
          version: 1,
          is_active: true,
        })
        .select()
        .single(),
    invalidateKeys: [instructionEditorKeys.all, instructionKeys.all],
  })
}

/**
 * Updates an existing instruction.
 */
export function useUpdateInstruction() {
  return useSupabaseMutation<Instruction, UpdateInstructionVars>({
    mutationFn: ({ id, property_id: _propertyId, ...fields }) =>
      supabase
        .from('instructions')
        .update(fields)
        .eq('id', id)
        .select()
        .single(),
    invalidateKeys: [instructionEditorKeys.all, instructionKeys.all],
  })
}

/**
 * Soft-deletes an instruction by setting `is_active = false`.
 */
export function useDeactivateInstruction() {
  return useSupabaseMutation<Instruction, DeactivateInstructionVars>({
    mutationFn: ({ id }) =>
      supabase
        .from('instructions')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single(),
    invalidateKeys: [instructionEditorKeys.all, instructionKeys.all],
  })
}

/**
 * Publishes an instruction by bumping the version number and setting
 * `published_at` / `published_by`.
 *
 * On success, sends an `instruction_update` notification to every
 * janitor currently rostered on the property.
 */
export function usePublishInstruction() {
  const userId = useAuthStore.getState().profile?.id

  return useSupabaseMutation<Instruction, PublishInstructionVars>({
    mutationFn: ({ id, currentVersion }) =>
      supabase
        .from('instructions')
        .update({
          version: currentVersion + 1,
          published_at: new Date().toISOString(),
          published_by: userId ?? null,
        })
        .eq('id', id)
        .select()
        .single(),
    onSuccess: async (data, vars) => {
      // Notify all janitors assigned to this property
      const { data: roster } = await supabase
        .from('roster_entries')
        .select('janitor_id')
        .eq('property_id', vars.property_id)
        .is('active_to', null)

      if (roster?.length) {
        await supabase.from('notifications').insert(
          roster.map((r) => ({
            recipient_id: r.janitor_id,
            type: 'instruction_update' as const,
            title: 'Ny driftsinstruks',
            body: 'Instrukser er oppdatert',
            data: {
              instruction_id: data.id,
              property_id: vars.property_id,
              version: vars.currentVersion + 1,
            },
          })),
        )
      }
    },
    invalidateKeys: [instructionEditorKeys.all, instructionKeys.all],
  })
}
