import { supabase } from '@/lib/supabase'
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery'
import { useSupabaseMutation } from '@/hooks/useSupabaseMutation'
import { useAuthStore } from '@/stores/authStore'
import type { AvvikComment } from '@/types/database'

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const avvikCommentKeys = {
  all: ['avvik-comments'] as const,
  forAvvik: (avvikId: string) => ['avvik-comments', avvikId] as const,
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AvvikCommentWithAuthor = AvvikComment & {
  author: { full_name: string }
}

interface AddAvvikCommentVariables {
  avvik_id: string
  content: string
  is_visible_to_customer: boolean
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Fetches all comments for a specific avvik, ordered chronologically.
 * Joins with `profiles` to resolve author names.
 */
export function useAvvikComments(avvikId: string | undefined) {
  return useSupabaseQuery(
    avvikCommentKeys.forAvvik(avvikId ?? ''),
    () =>
      supabase
        .from('avvik_comments')
        .select(
          '*, author:profiles!avvik_comments_author_id_fkey(full_name)',
        )
        .eq('avvik_id', avvikId!)
        .order('created_at', { ascending: true })
        .returns<AvvikCommentWithAuthor[]>(),
    { enabled: !!avvikId },
  )
}

/**
 * Mutation to add a comment to an avvik.
 * Inserts with the current user as author and invalidates comment queries.
 */
export function useAddAvvikComment() {
  return useSupabaseMutation<AvvikComment, AddAvvikCommentVariables>({
    mutationFn: ({ avvik_id, content, is_visible_to_customer }) => {
      const authorId = useAuthStore.getState().profile?.id

      return supabase
        .from('avvik_comments')
        .insert({
          avvik_id,
          author_id: authorId!,
          content,
          is_visible_to_customer,
        })
        .select()
        .single()
    },
    invalidateKeys: [avvikCommentKeys.all],
  })
}
