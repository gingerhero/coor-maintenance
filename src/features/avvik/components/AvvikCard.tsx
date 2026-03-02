import { useTranslation } from 'react-i18next'
import { MapPin, Clock, User } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { nb } from 'date-fns/locale'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { NS3451Badge } from '@/components/ns3451/NS3451Badge'
import type { AvvikWithReporter } from '@/features/avvik/hooks/useAvvik'
import { parseAvvikDescription } from '@/features/avvik/hooks/useAvvik'
import type { AvvikSeverity, AvvikStatus } from '@/types/database'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AvvikCardProps {
  avvik: AvvikWithReporter
  compact?: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSeverityVariant(severity: AvvikSeverity) {
  switch (severity) {
    case 'low':
      return 'success' as const
    case 'medium':
      return 'warning' as const
    case 'high':
      return 'destructive' as const
  }
}

function getStatusVariant(status: AvvikStatus) {
  switch (status) {
    case 'new':
      return 'default' as const
    case 'in_progress':
      return 'warning' as const
    case 'resolved':
      return 'success' as const
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AvvikCard({ avvik, compact = false }: AvvikCardProps) {
  const { t, i18n } = useTranslation('janitor')

  const { title, body } = parseAvvikDescription(avvik.description)
  const severityLabel = t(`avvik.severity${avvik.severity.charAt(0).toUpperCase() + avvik.severity.slice(1)}` as 'avvik.severityLow' | 'avvik.severityMedium' | 'avvik.severityHigh')
  const statusLabel = t(`avvik.status.${avvik.status}`)

  const dateLocale = i18n.language === 'nb' ? nb : undefined
  const timeAgo = formatDistanceToNow(new Date(avvik.created_at), {
    addSuffix: true,
    locale: dateLocale,
  })

  return (
    <Card className={cn('overflow-hidden', compact && 'shadow-none')}>
      <CardContent className={cn('space-y-2', compact ? 'p-3' : 'p-4')}>
        {/* Top row: severity badge + status badge */}
        <div className="flex items-center gap-2">
          <Badge variant={getSeverityVariant(avvik.severity)}>
            {severityLabel}
          </Badge>
          <Badge variant={getStatusVariant(avvik.status)} className="ml-auto">
            {statusLabel}
          </Badge>
        </div>

        {/* Title */}
        <h3 className="text-sm font-bold leading-snug">{title}</h3>

        {/* Description body */}
        {body && (
          <p
            className={cn(
              'text-sm text-muted-foreground',
              compact && 'line-clamp-2',
            )}
          >
            {body}
          </p>
        )}

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {/* Location */}
          {avvik.location_description && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {avvik.location_description}
            </span>
          )}

          {/* NS 3451 code */}
          {avvik.ns3451_code && (
            <NS3451Badge code={avvik.ns3451_code} />
          )}
        </div>

        {/* Reporter + timestamp */}
        <div className="flex items-center gap-3 border-t border-border pt-2 text-xs text-muted-foreground">
          {avvik.reported_by_profile?.full_name && (
            <span className="inline-flex items-center gap-1">
              <User className="h-3 w-3" />
              {avvik.reported_by_profile.full_name}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {timeAgo}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
