'use client'

import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNS3451Codes } from '@/features/ns3451/hooks/useNS3451Codes'
import type { NS3451Code } from '@/types/database'
import { getCategoryColor } from './ns3451-colors'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NS3451BadgeProps {
  /** The NS 3451 code string (e.g. "26", "263"). */
  code: string
  /**
   * Pre-fetched codes array. When provided, the component avoids calling
   * the `useNS3451Codes` hook internally, which is useful when a parent
   * already has the data (e.g. inside a list).
   */
  codes?: NS3451Code[]
  /** Additional className. */
  className?: string
}

// ---------------------------------------------------------------------------
// Internal wrapper that uses the hook (only mounted when `codes` prop is absent)
// ---------------------------------------------------------------------------

function BadgeWithHook({ code, className }: { code: string; className?: string }) {
  const { codes } = useNS3451Codes()
  return <BadgeInner code={code} codes={codes} className={className} />
}

// ---------------------------------------------------------------------------
// Pure presentational inner badge
// ---------------------------------------------------------------------------

function BadgeInner({
  code,
  codes,
  className,
}: {
  code: string
  codes: NS3451Code[]
  className?: string
}) {
  const codeObj = codes.find((c) => c.code === code)
  const color = getCategoryColor(code)

  const displayLabel = codeObj ? `${codeObj.code} ${codeObj.title_nb}` : code
  const isHighRisk = codeObj?.is_high_risk ?? false

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        color.bg,
        color.text,
        className,
      )}
    >
      <span
        className={cn('inline-block h-2 w-2 shrink-0 rounded-full', color.bgSolid)}
        aria-hidden
      />
      <span className="truncate max-w-[200px]">{displayLabel}</span>
      {isHighRisk && (
        <AlertTriangle
          className="h-3 w-3 shrink-0 text-destructive"
          aria-label="Hoyrisiko"
        />
      )}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

export function NS3451Badge({ code, codes, className }: NS3451BadgeProps) {
  if (codes) {
    return <BadgeInner code={code} codes={codes} className={className} />
  }
  return <BadgeWithHook code={code} className={className} />
}
