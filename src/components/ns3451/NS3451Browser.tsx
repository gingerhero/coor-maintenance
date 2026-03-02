'use client'

import { useMemo } from 'react'
import { AlertTriangle } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useNS3451Codes } from '@/features/ns3451/hooks/useNS3451Codes'
import type { NS3451Code } from '@/types/database'
import { getCategoryColor } from './ns3451-colors'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NS3451BrowserProps {
  /** Callback when a code is selected. If omitted, items are not interactive. */
  onSelect?: (code: NS3451Code) => void
  /** Currently selected code string (used for highlight). */
  selectedCode?: string
  /** Maximum depth to render (1 = top-level only, 2 = two levels, 3 = all). Default 3. */
  level?: 1 | 2 | 3
  /** Optional className for the root container. */
  className?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function CodeLabel({ code }: { code: NS3451Code }) {
  return (
    <span className="truncate">
      <span className="font-mono font-semibold">{code.code}</span>{' '}
      <span>{code.title_nb}</span>
      {code.title_en && (
        <span className="text-muted-foreground"> ({code.title_en})</span>
      )}
    </span>
  )
}

function HighRiskBadge() {
  return (
    <Badge variant="destructive" className="ml-2 gap-1 px-1.5 py-0.5 text-[10px]">
      <AlertTriangle className="h-3 w-3" />
      Hoyrisiko
    </Badge>
  )
}

function CategoryDot({ code }: { code: string }) {
  const color = getCategoryColor(code)
  return (
    <span
      className={cn('inline-block h-2.5 w-2.5 shrink-0 rounded-full', color.bgSolid)}
      aria-hidden
    />
  )
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function BrowserSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-3">
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-4 w-48" />
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Level 3 leaf item
// ---------------------------------------------------------------------------

function Level3Item({
  code,
  onSelect,
  isSelected,
}: {
  code: NS3451Code
  onSelect?: (code: NS3451Code) => void
  isSelected: boolean
}) {
  const color = getCategoryColor(code.code)
  const interactive = !!onSelect

  return (
    <button
      type="button"
      disabled={!interactive}
      onClick={() => onSelect?.(code)}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors',
        'border-l-2',
        color.border,
        interactive && 'hover:bg-muted cursor-pointer',
        !interactive && 'cursor-default',
        isSelected && 'bg-muted ring-2 ring-coor-blue-500 ring-offset-1',
      )}
    >
      <CategoryDot code={code.code} />
      <CodeLabel code={code} />
      {code.is_high_risk && <HighRiskBadge />}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Level 2 accordion (contains Level 3 children)
// ---------------------------------------------------------------------------

function Level2Section({
  code,
  children,
  onSelect,
  isSelected,
  selectedCode,
  maxLevel,
}: {
  code: NS3451Code
  children: NS3451Code[]
  onSelect?: (code: NS3451Code) => void
  isSelected: boolean
  selectedCode?: string
  maxLevel: 1 | 2 | 3
}) {
  const color = getCategoryColor(code.code)
  const interactive = !!onSelect
  const hasChildren = children.length > 0 && maxLevel >= 3

  // If there are no level-3 children or we cap at level 2, render as a leaf
  if (!hasChildren) {
    return (
      <button
        type="button"
        disabled={!interactive}
        onClick={() => onSelect?.(code)}
        className={cn(
          'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors',
          'border-l-2',
          color.border,
          interactive && 'hover:bg-muted cursor-pointer',
          !interactive && 'cursor-default',
          isSelected && 'bg-muted ring-2 ring-coor-blue-500 ring-offset-1',
        )}
      >
        <CategoryDot code={code.code} />
        <CodeLabel code={code} />
        {code.is_high_risk && <HighRiskBadge />}
      </button>
    )
  }

  return (
    <AccordionItem value={code.code} className={cn('border-l-2 border-b-0', color.border)}>
      <div className="flex items-center gap-1">
        {interactive && (
          <button
            type="button"
            onClick={() => onSelect?.(code)}
            className={cn(
              'flex items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors hover:bg-muted',
              isSelected && 'bg-muted ring-2 ring-coor-blue-500 ring-offset-1',
            )}
            aria-label={`Velg ${code.code} ${code.title_nb}`}
          >
            <CategoryDot code={code.code} />
          </button>
        )}
        <AccordionTrigger className="flex-1 py-2 text-sm hover:no-underline">
          <span className="flex items-center gap-2">
            {!interactive && <CategoryDot code={code.code} />}
            <CodeLabel code={code} />
            {code.is_high_risk && <HighRiskBadge />}
          </span>
        </AccordionTrigger>
      </div>
      <AccordionContent className="pl-4 pb-1">
        <div className="space-y-1">
          {children.map((child) => (
            <Level3Item
              key={child.id}
              code={child}
              onSelect={onSelect}
              isSelected={child.code === selectedCode}
            />
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function NS3451Browser({
  onSelect,
  selectedCode,
  level: maxLevel = 3,
  className,
}: NS3451BrowserProps) {
  const { codes, codesByLevel, codesByParent, isLoading } = useNS3451Codes()

  // Top-level (Level 1) codes
  const level1Codes = useMemo(
    () => codesByLevel.get(1) ?? [],
    [codesByLevel],
  )

  if (isLoading) {
    return <BrowserSkeleton />
  }

  if (codes.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Ingen NS 3451-koder funnet.
      </p>
    )
  }

  return (
    <Accordion
      type="multiple"
      className={cn('w-full', className)}
    >
      {level1Codes.map((l1) => {
        const color = getCategoryColor(l1.code)
        const l2Children = codesByParent.get(l1.code) ?? []
        const hasL2 = l2Children.length > 0 && maxLevel >= 2

        // Level 1 rendered as leaf when no children or maxLevel === 1
        if (!hasL2) {
          return (
            <div key={l1.id} className={cn('border-l-4 rounded-md px-1 mb-1', color.border)}>
              <button
                type="button"
                disabled={!onSelect}
                onClick={() => onSelect?.(l1)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-3 py-3 text-left text-sm font-medium transition-colors',
                  onSelect && 'hover:bg-muted cursor-pointer',
                  !onSelect && 'cursor-default',
                  selectedCode === l1.code && 'bg-muted ring-2 ring-coor-blue-500 ring-offset-1',
                )}
              >
                <CategoryDot code={l1.code} />
                <CodeLabel code={l1} />
                {l1.is_high_risk && <HighRiskBadge />}
              </button>
            </div>
          )
        }

        return (
          <AccordionItem
            key={l1.id}
            value={l1.code}
            className={cn('border-l-4 border-b mb-1 rounded-md', color.border)}
          >
            <div className="flex items-center gap-1 px-1">
              {onSelect && (
                <button
                  type="button"
                  onClick={() => onSelect(l1)}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors hover:bg-muted',
                    selectedCode === l1.code && 'bg-muted ring-2 ring-coor-blue-500 ring-offset-1',
                  )}
                  aria-label={`Velg ${l1.code} ${l1.title_nb}`}
                >
                  <CategoryDot code={l1.code} />
                </button>
              )}
              <AccordionTrigger className="flex-1 py-3 hover:no-underline">
                <span className="flex items-center gap-2">
                  {!onSelect && <CategoryDot code={l1.code} />}
                  <CodeLabel code={l1} />
                  {l1.is_high_risk && <HighRiskBadge />}
                  <Badge variant="secondary" className="ml-1 text-[10px]">
                    {l2Children.length}
                  </Badge>
                </span>
              </AccordionTrigger>
            </div>

            <AccordionContent className="pl-4 pb-2">
              {maxLevel >= 3 ? (
                // Level 2 items as nested accordions
                <Accordion type="multiple" className="w-full">
                  {l2Children.map((l2) => {
                    const l3Children = codesByParent.get(l2.code) ?? []
                    return (
                      <Level2Section
                        key={l2.id}
                        code={l2}
                        children={l3Children}
                        onSelect={onSelect}
                        isSelected={selectedCode === l2.code}
                        selectedCode={selectedCode}
                        maxLevel={maxLevel}
                      />
                    )
                  })}
                </Accordion>
              ) : (
                // Level 2 as leaf items (maxLevel === 2)
                <div className="space-y-1">
                  {l2Children.map((l2) => (
                    <button
                      key={l2.id}
                      type="button"
                      disabled={!onSelect}
                      onClick={() => onSelect?.(l2)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors',
                        'border-l-2',
                        color.border,
                        onSelect && 'hover:bg-muted cursor-pointer',
                        !onSelect && 'cursor-default',
                        selectedCode === l2.code &&
                          'bg-muted ring-2 ring-coor-blue-500 ring-offset-1',
                      )}
                    >
                      <CategoryDot code={l2.code} />
                      <CodeLabel code={l2} />
                      {l2.is_high_risk && <HighRiskBadge />}
                    </button>
                  ))}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}
