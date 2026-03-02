import { useTranslation } from 'react-i18next'
import { Building2, Clock, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Assignment, Property } from '@/types/database'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AssignmentCardProps {
  assignment: Assignment & {
    property: Pick<Property, 'id' | 'name' | 'address' | 'estimated_weekly_hours'>
  }
  onTap: (id: string) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const statusVariantMap: Record<
  Assignment['status'],
  { variant: 'default' | 'success' | 'secondary' | 'warning'; labelKey: string }
> = {
  scheduled: { variant: 'default', labelKey: 'home.status.scheduled' },
  in_progress: { variant: 'success', labelKey: 'home.status.inProgress' },
  completed: { variant: 'secondary', labelKey: 'home.status.completed' },
  cancelled: { variant: 'warning', labelKey: 'home.status.cancelled' },
}

function formatTimeWindow(start: string | null, end: string | null): string {
  if (!start && !end) return ''
  const fmt = (t: string) => t.slice(0, 5) // "08:00:00" -> "08:00"
  if (start && end) return `${fmt(start)} - ${fmt(end)}`
  if (start) return fmt(start)
  return fmt(end!)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AssignmentCard({ assignment, onTap }: AssignmentCardProps) {
  const { t } = useTranslation('janitor')
  const { property, status, scheduled_start, scheduled_end } = assignment
  const { variant, labelKey } = statusVariantMap[status]
  const timeWindow = formatTimeWindow(scheduled_start, scheduled_end)

  return (
    <Card
      className={cn(
        'cursor-pointer transition-shadow hover:shadow-md active:shadow-sm',
        'min-h-[44px]',
      )}
      role="button"
      tabIndex={0}
      onClick={() => onTap(assignment.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onTap(assignment.id)
        }
      }}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Left: property info */}
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate text-base font-semibold">{property.name}</span>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{property.address}</span>
            </div>

            {timeWindow && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span>{timeWindow}</span>
              </div>
            )}
          </div>

          {/* Right: badges */}
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <Badge variant={variant}>{t(labelKey)}</Badge>

            {status === 'in_progress' && (
              <Badge variant="success">{t('visit.checkedIn')}</Badge>
            )}

            {property.estimated_weekly_hours != null && (
              <span className="text-xs text-muted-foreground">
                {property.estimated_weekly_hours}t
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
