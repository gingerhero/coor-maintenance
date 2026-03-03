import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { format, parseISO } from 'date-fns'
import { nb } from 'date-fns/locale'
import { Send } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useAvvikComments,
  useAddAvvikComment,
} from '@/features/avvik/hooks/useAvvikComments'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CommentThreadProps {
  avvikId: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CommentThread({ avvikId }: CommentThreadProps) {
  const { t } = useTranslation('manager')
  const { data: comments, isLoading } = useAvvikComments(avvikId)
  const addComment = useAddAvvikComment()

  const [body, setBody] = useState('')
  const [isVisibleToCustomer, setIsVisibleToCustomer] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!body.trim()) return

    addComment.mutate(
      {
        avvik_id: avvikId,
        content: body.trim(),
        is_visible_to_customer: isVisibleToCustomer,
      },
      {
        onSuccess: () => {
          setBody('')
          setIsVisibleToCustomer(false)
        },
      },
    )
  }

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold">{t('avvikInbox.comment')}</h4>

      {/* Comment list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : !comments || comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t('avvikInbox.noComments')}
        </p>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-md border border-border bg-muted/30 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">
                  {comment.author?.full_name ?? '—'}
                </span>
                <div className="flex items-center gap-2">
                  {comment.is_visible_to_customer && (
                    <Badge variant="outline" className="text-xs">
                      {t('avvikInbox.visibleToCustomer')}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {format(parseISO(comment.created_at), 'd. MMM yyyy HH:mm', {
                      locale: nb,
                    })}
                  </span>
                </div>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                {comment.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Add comment form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-coor-blue-500 focus:ring-offset-1"
          rows={3}
          placeholder={t('avvikInbox.commentBody')}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
        />
        <div className="flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isVisibleToCustomer}
              onChange={(e) => setIsVisibleToCustomer(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            {t('avvikInbox.visibleToCustomer')}
          </label>
          <Button
            type="submit"
            size="sm"
            disabled={!body.trim() || addComment.isPending}
          >
            <Send className="mr-1 h-4 w-4" />
            {t('avvikInbox.submitComment')}
          </Button>
        </div>
      </form>
    </div>
  )
}
