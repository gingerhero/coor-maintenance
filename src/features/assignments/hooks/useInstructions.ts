import { supabase } from '@/lib/supabase'
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery'
import type { Instruction, NS3451Code } from '@/types/database'

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const instructionKeys = {
  all: ['instructions'] as const,
  forProperty: (propertyId: string) => ['instructions', 'property', propertyId] as const,
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InstructionWithNS3451 = Instruction & {
  ns3451: Pick<NS3451Code, 'code' | 'title_nb' | 'title_en' | 'level' | 'is_high_risk'>
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Fetches active instructions for a given property.
 *
 * Joins with `ns3451_codes` to include the code metadata needed for
 * display (title, risk level, etc.). Results are ordered by NS 3451 code
 * for consistent grouping in the checklist UI.
 */
export function usePropertyInstructions(propertyId: string | undefined) {
  return useSupabaseQuery(
    instructionKeys.forProperty(propertyId ?? ''),
    () =>
      supabase
        .from('instructions')
        .select('*, ns3451:ns3451_codes(code, title_nb, title_en, level, is_high_risk)')
        .eq('property_id', propertyId!)
        .eq('is_active', true)
        .order('ns3451_code')
        .returns<InstructionWithNS3451[]>(),
    { enabled: !!propertyId },
  )
}
