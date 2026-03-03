import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { format, parseISO } from 'date-fns'
import { nb } from 'date-fns/locale'
import {
  ChevronDown,
  ChevronUp,
  User,
  Calendar,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { AvvikStatus } from '@/types/database'
import {
  parseAvvikDescription,
  type AvvikWithReporter,
} from '@/features/avvik/hooks/useAvvik'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AvvikTimelineProps {
  avvik: AvvikWithReporter[]
  onStatusChange?: (id: string, status: AvvikStatus) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function severityVariant(severity: string) {
  switch (severity) {
    case 'high':
      return 'destructive' as const
    case 'medium':
      return 'warning' as const
    case 'low':
    default:
      return 'secondary' as const
  }
}

function statusVariant(status: string) {
  switch (status) {
    case 'new':
      return 'default' as const
    case 'in_progress':
      return 'warning' as const
    case 'resolved':
      return 'success' as const
    default:
      return 'secondary' as const
  }
}

// ---------------------------------------------------------------------------
// Timeline item
// ---------------------------------------------------------------------------

function AvvikTimelineItem({
  item,
  onStatusChange,
}: {
  item: AvvikWithReporter
  onStatusChange?: (id: string, status: AvvikStatus) => void
}) {
  const { t } = useTranslation('manager')
  const [expanded, setExpanded] = useState(false)
  const { title, body } = parseAvvikDescription(item.description)

  const dateFormatted = format(parseISO(item.created_at), 'd. MMM yyyy', {
    locale: nb,
  })
  const timeFormatted = format(parseISO(item.created_at), 'HH:mm')
  const reporterName =
    item.reported_by_profile?.full_name ?? t('avvikTimeline.reportedBy')

  const nextStatuses: AvvikStatus[] = []
  if (item.status === 'new') nextStatuses.push('in_progress', 'resolved')
  if (item.status === 'in_progress') nextStatuses.push('resolved')

  return (
    <div className="relative flex gap-3">
      {/* Timeline dot + line */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'mt-1.5 h-3 w-3 shrink-0 rounded-full border-2',
            item.severity === 'high'
              ? 'border-destructive bg-destructive/20'
              : item.severity === 'medium'
                ? 'border-coor-orange-500 bg-coor-orange-500/20'
                : 'border-muted-foreground bg-muted',
          )}
        />
        <div className="w-px flex-1 bg-border" />
      </div>

      {/* Content */}
      <Card className="mb-3 flex-1">
        <CardContent className="p-4">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={severityVariant(item.severity)}>
                  {t(`avvikTimeline.severity.${item.severity}`)}
                </Badge>
                <Badge variant={statusVariant(item.status)}>
                  {t(`avvikTimeline.status.${item.status}`)}
                </Badge>
              </div>
              <h3 className="mt-2 text-sm font-semibold leading-tight">
                {title}
              </h3>
            </div>
            <button
              type="button"
              className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted"
              onClick={() => setExpanded((prev) => !prev)}
              aria-label={expanded ? 'Collapse' : 'Expand'}
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Meta row */}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {reporterName}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {dateFormatted} {timeFormatted}
            </span>
          </div>

          {/* Expanded body */}
          {expanded && (
            <div className="mt-3 space-y-3">
              {body && (
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {body}
                </p>
              )}

              {item.location_description && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">{t('property.address')}:</span>{' '}
                  {item.location_description}
                </p>
              )}

              {item.ns3451_code && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">NS 3451:</span>{' '}
                  {item.ns3451_code}
                </p>
              )}

              {/* Status change buttons */}
              {onStatusChange && nextStatuses.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {nextStatuses.map((status) => (
                    <button
                      key={status}
                      type="button"
                      className={cn(
                        'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                        status === 'resolved'
                          ? 'bg-coor-green-500/10 text-coor-green-700 hover:bg-coor-green-500/20'
                          : 'bg-coor-orange-500/10 text-coor-orange-700 hover:bg-coor-orange-500/20',
                      )}
                      onClick={(e) => {
                        e.stopPropagation()
                        onStatusChange(item.id, status)
                      }}
                    >
                      {t(`avvikTimeline.status.${status}`)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AvvikTimeline({ avvik, onStatusChange }: AvvikTimelineProps) {
  return (
    <div className="relative">
      {avvik.map((item) => (
        <AvvikTimelineItem
          key={item.id}
          item={item}
          onStatusChange={onStatusChange}
        />
      ))}
    </div>
  )
}
