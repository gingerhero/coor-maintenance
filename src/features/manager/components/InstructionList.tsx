import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { FileText } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { useNS3451Codes } from '@/features/ns3451/hooks/useNS3451Codes'
import { getCategoryColor } from '@/components/ns3451'
import { InstructionCard } from './InstructionCard'
import type { InstructionWithNS3451 } from '@/features/assignments/hooks/useInstructions'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InstructionListProps {
  instructions: InstructionWithNS3451[]
  onSelect: (instruction: InstructionWithNS3451) => void
  onPublish: (instruction: InstructionWithNS3451) => void
  isLoading: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface InstructionGroup {
  parentCode: string
  title: string
  items: InstructionWithNS3451[]
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InstructionList({
  instructions,
  onSelect,
  onPublish,
  isLoading,
}: InstructionListProps) {
  const { t } = useTranslation('manager')
  const { codeMap } = useNS3451Codes()

  // Group instructions by top-level NS3451 code
  const groups = useMemo<InstructionGroup[]>(() => {
    if (!instructions.length) return []

    const groupMap = new Map<string, InstructionWithNS3451[]>()

    for (const inst of instructions) {
      const parentCode = inst.ns3451.code.split('.')[0] ?? inst.ns3451.code.substring(0, 1)
      const existing = groupMap.get(parentCode)
      if (existing) {
        existing.push(inst)
      } else {
        groupMap.set(parentCode, [inst])
      }
    }

    return Array.from(groupMap.entries()).map(([parentCode, items]) => {
      const codeObj = codeMap.get(parentCode)
      const title = codeObj?.title_nb ?? parentCode

      // Sort: active first, then inactive
      const sorted = [...items].sort((a, b) => {
        if (a.is_active === b.is_active) return 0
        return a.is_active ? -1 : 1
      })

      return { parentCode, title, items: sorted }
    })
  }, [instructions, codeMap])

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  // Empty state
  if (!instructions.length) {
    return (
      <EmptyState
        icon={<FileText />}
        title={t('instructions.noInstructions')}
        description={t('instructions.noInstructionsDescription')}
      />
    )
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => {
        const color = getCategoryColor(group.parentCode)
        return (
          <section key={group.parentCode}>
            <h3
              className="mb-3 flex items-center gap-2 text-sm font-semibold"
            >
              <span
                className={`inline-block h-3 w-3 rounded-full ${color.bgSolid}`}
                aria-hidden
              />
              <span>{group.parentCode} {group.title}</span>
            </h3>
            <div className="space-y-3">
              {group.items.map((inst) => (
                <InstructionCard
                  key={inst.id}
                  instruction={inst}
                  onClick={() => onSelect(inst)}
                  onPublish={onPublish}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
