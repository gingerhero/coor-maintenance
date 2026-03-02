import { AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FrequencyBadgeProps {
  /** Frequency label, e.g. "Ukentlig", "Månedlig" */
  frequencyLabel: string
  /** Season label, e.g. "Sommer", "Vinter", or undefined if all year */
  seasonLabel?: string
  /** Show a red overdue badge */
  isOverdue?: boolean
  className?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Compact badge row showing task frequency, optional season, and overdue state.
 * Used inside TaskCard and anywhere a quick frequency indicator is needed.
 */
export function FrequencyBadge({
  frequencyLabel,
  seasonLabel,
  isOverdue,
  className,
}: FrequencyBadgeProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      <Badge variant="secondary" className="text-[11px] px-2 py-0">
        {frequencyLabel}
      </Badge>

      {seasonLabel && seasonLabel !== 'Hele året' && (
        <Badge variant="outline" className="text-[11px] px-2 py-0">
          {seasonLabel}
        </Badge>
      )}

      {isOverdue && (
        <Badge variant="destructive" className="gap-1 text-[11px] px-2 py-0">
          <AlertTriangle className="h-3 w-3" />
          Forfalt
        </Badge>
      )}
    </div>
  )
}
