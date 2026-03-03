import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CheckCircle2,
  Circle,
  SkipForward,
  Camera,
  Bell,
  Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { ChecklistItem } from '@/features/janitor/hooks/useChecklist'
import { FrequencyBadge } from './FrequencyBadge'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TaskCardProps {
  item: ChecklistItem
  onComplete: (instructionId: string) => void
  onSkip: (instructionId: string) => void
  onReportAvvik: (instructionId: string) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Individual task card in the checklist. Touch-friendly with clear visual
 * states for pending, completed, and skipped tasks.
 */
export function TaskCard({
  item,
  onComplete,
  onSkip,
}: TaskCardProps) {
  const { t } = useTranslation('janitor')
  const [commentExpanded, setCommentExpanded] = useState(false)

  const {
    instruction,
    isCompleted,
    isSkipped,
    isOverdue,
    frequencyLabel,
    seasonLabel,
    execution,
  } = item

  const isPending = !isCompleted && !isSkipped

  return (
    <div
      className={cn(
        'flex min-h-[56px] gap-3 rounded-lg border border-border p-3 transition-all duration-200',
        isCompleted && 'border-coor-green-500/30 bg-coor-green-500/5',
        isSkipped && 'border-amber-400/30 bg-amber-50',
        isPending && isOverdue && 'border-destructive/30 bg-destructive/5',
        isPending && !isOverdue && 'bg-card',
      )}
    >
      {/* Left: status indicator */}
      <div className="flex shrink-0 items-start pt-0.5">
        {isCompleted && (
          <CheckCircle2 className="h-6 w-6 text-coor-green-500" />
        )}
        {isSkipped && (
          <SkipForward className="h-6 w-6 text-amber-500" />
        )}
        {isPending && (
          <Circle className="h-6 w-6 text-muted-foreground/50" />
        )}
      </div>

      {/* Center: main content */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {/* Description */}
        <p
          className={cn(
            'text-sm leading-snug',
            isCompleted && 'text-muted-foreground line-through',
            isSkipped && 'text-muted-foreground',
          )}
        >
          {instruction.description}
        </p>

        {/* Metadata row */}
        <div className="flex flex-wrap items-center gap-1.5">
          <FrequencyBadge
            frequencyLabel={frequencyLabel}
            seasonLabel={seasonLabel}
            isOverdue={isPending && isOverdue}
          />

          {instruction.photo_required && (
            <Badge variant="outline" className="gap-1 text-[11px] px-2 py-0">
              <Camera className="h-3 w-3" />
              {t('checklist.photoRequired')}
            </Badge>
          )}

          {instruction.notify_board && (
            <Badge variant="outline" className="gap-1 text-[11px] px-2 py-0">
              <Bell className="h-3 w-3" />
            </Badge>
          )}

          {instruction.comment && (
            <button
              type="button"
              className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-muted transition-colors"
              onClick={() => setCommentExpanded(!commentExpanded)}
              aria-expanded={commentExpanded}
              aria-label="Vis kommentar"
            >
              <Info className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Expanded comment */}
        {commentExpanded && instruction.comment && (
          <p className="text-xs text-muted-foreground rounded bg-muted/50 p-2">
            {instruction.comment}
          </p>
        )}

        {/* Skip reason (when skipped) */}
        {isSkipped && execution?.skip_note && (
          <p className="text-xs text-amber-700">
            {execution.skip_note}
          </p>
        )}

        {/* Completed / skipped badges (when resolved) */}
        {isCompleted && (
          <Badge variant="success" className="w-fit gap-1 text-[11px]">
            <CheckCircle2 className="h-3 w-3" />
            {t('checklist.done')}
          </Badge>
        )}
        {isSkipped && (
          <Badge variant="warning" className="w-fit text-[11px]">
            {t('checklist.skip')}
          </Badge>
        )}
      </div>

      {/* Right: action buttons (pending only) */}
      {isPending && (
        <div className="flex shrink-0 flex-col gap-1.5">
          <Button
            size="sm"
            className="min-h-[44px] min-w-[44px] bg-coor-green-500 text-white hover:bg-coor-green-600 active:bg-coor-green-700"
            onClick={() => onComplete(instruction.id)}
          >
            {t('checklist.done')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="min-h-[44px] min-w-[44px]"
            onClick={() => onSkip(instruction.id)}
          >
            {t('checklist.skip')}
          </Button>
        </div>
      )}
    </div>
  )
}
