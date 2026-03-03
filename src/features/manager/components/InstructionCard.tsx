import { useTranslation } from 'react-i18next'
import { Camera, Bell } from 'lucide-react'
import { format } from 'date-fns'
import { nb } from 'date-fns/locale'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { NS3451Badge } from '@/components/ns3451'
import { cn } from '@/lib/utils'
import type { InstructionWithNS3451 } from '@/features/assignments/hooks/useInstructions'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InstructionCardProps {
  instruction: InstructionWithNS3451
  onClick: () => void
  onPublish?: (instruction: InstructionWithNS3451) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InstructionCard({ instruction, onClick, onPublish }: InstructionCardProps) {
  const { t } = useTranslation('manager')

  const frequencyLabel =
    instruction.frequency_type === 'every_visit'
      ? t(`instructions.frequencyTypes.${instruction.frequency_type}`)
      : `${t(`instructions.frequencyTypes.${instruction.frequency_type}`)} (${instruction.frequency_interval})`

  const publishedLabel = instruction.published_at
    ? `${t('instructions.published')} ${format(new Date(instruction.published_at), 'd. MMM yyyy', { locale: nb })}`
    : t('instructions.unpublished')

  return (
    <Card
      className={cn(
        'cursor-pointer transition-colors hover:bg-muted/50',
        !instruction.is_active && 'opacity-60',
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        {/* Header: NS3451 badge */}
        <div className="mb-2 flex items-start justify-between gap-2">
          <NS3451Badge code={instruction.ns3451_code} />
          <div className="flex items-center gap-1.5">
            {/* Active/inactive dot */}
            <span
              className={cn(
                'inline-block h-2 w-2 rounded-full',
                instruction.is_active ? 'bg-coor-green-500' : 'bg-muted-foreground',
              )}
              title={instruction.is_active ? t('instructions.activeStatus') : t('instructions.inactiveStatus')}
            />
            {instruction.photo_required && (
              <Camera className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            {instruction.notify_board && (
              <Bell className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Description */}
        <p className="mb-2 line-clamp-2 text-sm text-foreground">
          {instruction.description}
        </p>

        {/* Metadata row */}
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{frequencyLabel}</span>
          {instruction.season !== 'none' && (
            <Badge variant="secondary" className="text-xs">
              {t(`instructions.seasons.${instruction.season}`)}
            </Badge>
          )}
          <span>v{instruction.version}</span>
        </div>

        {/* Published status + publish button */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{publishedLabel}</span>
          {onPublish && instruction.is_active && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation()
                onPublish(instruction)
              }}
            >
              {t('instructions.publish')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
