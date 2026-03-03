import { supabase } from '@/lib/supabase'
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery'
import { useSupabaseMutation } from '@/hooks/useSupabaseMutation'
import { useAuthStore } from '@/stores/authStore'
import type { Notification } from '@/types/database'

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const acknowledgmentKeys = {
  all: ['instruction-acknowledgment'] as const,
  forUser: (userId: string) => ['instruction-acknowledgment', userId] as const,
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Fetches unacknowledged instruction update notifications for the current user.
 *
 * Returns notifications of type `instruction_update` that have not yet been
 * read (i.e. `read_at IS NULL`).
 */
export function useUnacknowledgedInstructions() {
  const userId = useAuthStore((s) => s.profile?.id)

  return useSupabaseQuery(
    acknowledgmentKeys.forUser(userId ?? ''),
    () =>
      supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', userId!)
        .eq('type', 'instruction_update')
        .is('read_at', null)
        .returns<Notification[]>(),
    { enabled: !!userId },
  )
}

/**
 * Marks instruction update notifications as acknowledged by setting `read_at`.
 */
export function useAcknowledgeInstructions() {
  return useSupabaseMutation<Notification[], { notificationIds: string[] }>({
    mutationFn: ({ notificationIds }) =>
      supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .in('id', notificationIds)
        .select()
        .returns<Notification[]>(),
    invalidateKeys: [acknowledgmentKeys.all],
  })
}
