import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { nb } from 'date-fns/locale'
import { ChevronDown, ChevronUp, User, Calendar, MessageSquare } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useProperties } from '@/features/properties/hooks/useProperties'
import { parseAvvikDescription } from '@/features/avvik/hooks/useAvvik'
import {
  useCustomerAvvik,
  useCustomerAvvikComments,
  type CustomerAvvikItem,
} from '../hooks/useCustomerData'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function severityVariant(severity: string) {
  switch (severity) {
    case 'high':
      return 'destructive' as const
    case 'medium':
      return 'warning' as const
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
// Page
// ---------------------------------------------------------------------------

export function CustomerAvvikPage() {
  const { t } = useTranslation('customer')
  const [searchParams, setSearchParams] = useSearchParams()
  const propertyFromUrl = searchParams.get('property') ?? undefined
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | undefined>(propertyFromUrl)

  const { data: properties } = useProperties()
  const { data: avvik, isLoading } = useCustomerAvvik(selectedPropertyId)

  const openAvvik = useMemo(
    () => avvik?.filter((a) => a.status !== 'resolved') ?? [],
    [avvik],
  )
  const resolvedAvvik = useMemo(
    () => avvik?.filter((a) => a.status === 'resolved') ?? [],
    [avvik],
  )

  function handlePropertyChange(value: string) {
    const id = value === 'all' ? undefined : value
    setSelectedPropertyId(id)
    if (id) {
      setSearchParams({ property: id })
    } else {
      setSearchParams({})
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t('avvik.title')}</h1>

      {/* Property filter */}
      <Select
        value={selectedPropertyId ?? 'all'}
        onValueChange={handlePropertyChange}
      >
        <SelectTrigger className="max-w-xs">
          <SelectValue placeholder={t('avvik.allProperties')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('avvik.allProperties')}</SelectItem>
          {properties?.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="mb-2 h-5 w-1/2" />
              <Skeleton className="h-4 w-3/4" />
            </Card>
          ))}
        </div>
      ) : (
        <Tabs defaultValue="open">
          <TabsList>
            <TabsTrigger value="open">
              {t('avvik.open')} ({openAvvik.length})
            </TabsTrigger>
            <TabsTrigger value="resolved">
              {t('avvik.resolved')} ({resolvedAvvik.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="open" className="mt-4">
            {openAvvik.length === 0 ? (
              <EmptyState
                title={t('avvik.noAvvik')}
                description={t('avvik.noAvvikDescription')}
              />
            ) : (
              <AvvikList items={openAvvik} />
            )}
          </TabsContent>

          <TabsContent value="resolved" className="mt-4">
            {resolvedAvvik.length === 0 ? (
              <EmptyState
                title={t('avvik.noAvvik')}
                description={t('avvik.noAvvikDescription')}
              />
            ) : (
              <AvvikList items={resolvedAvvik} />
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Avvik list (read-only timeline)
// ---------------------------------------------------------------------------

function AvvikList({ items }: { items: CustomerAvvikItem[] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <AvvikCard key={item.id} item={item} />
      ))}
    </div>
  )
}

function AvvikCard({ item }: { item: CustomerAvvikItem }) {
  const { t } = useTranslation('customer')
  const { t: tm } = useTranslation('manager')
  const [expanded, setExpanded] = useState(false)
  const { title, body } = parseAvvikDescription(item.description)

  const dateFormatted = format(parseISO(item.created_at), 'd. MMM yyyy', {
    locale: nb,
  })
  const reporterName = item.reported_by_profile?.full_name ?? '—'
  const propertyName = (item.property as unknown as { name: string })?.name ?? ''

  return (
    <Card>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={severityVariant(item.severity)}>
                {tm(`avvikTimeline.severity.${item.severity}`)}
              </Badge>
              <Badge variant={statusVariant(item.status)}>
                {tm(`avvikTimeline.status.${item.status}`)}
              </Badge>
              {propertyName && (
                <span className="text-xs text-muted-foreground">{propertyName}</span>
              )}
            </div>
            <h3 className="mt-2 text-sm font-semibold leading-tight">{title}</h3>
          </div>
          <button
            type="button"
            className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted"
            onClick={() => setExpanded((prev) => !prev)}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        {/* Meta */}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {reporterName}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {dateFormatted}
          </span>
        </div>

        {/* Expanded content */}
        {expanded && (
          <div className="mt-3 space-y-3">
            {body && (
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{body}</p>
            )}
            {item.location_description && (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">{tm('property.address')}:</span> {item.location_description}
              </p>
            )}
            {item.resolved_at && (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">{t('avvik.resolvedOn')}:</span>{' '}
                {format(parseISO(item.resolved_at), 'd. MMM yyyy', { locale: nb })}
              </p>
            )}

            {/* Comments */}
            <AvvikComments avvikId={item.id} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Comments section
// ---------------------------------------------------------------------------

function AvvikComments({ avvikId }: { avvikId: string }) {
  const { t } = useTranslation('customer')
  const { data: comments, isLoading } = useCustomerAvvikComments(avvikId)

  if (isLoading) {
    return <Skeleton className="h-8 w-full" />
  }

  if (!comments?.length) {
    return (
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <MessageSquare className="h-3 w-3" />
        {t('avvik.noComments')}
      </p>
    )
  }

  return (
    <div className="space-y-2 border-t pt-2">
      <p className="flex items-center gap-1 text-xs font-medium">
        <MessageSquare className="h-3 w-3" />
        {t('avvik.comments')} ({comments.length})
      </p>
      {comments.map((comment) => (
        <div key={comment.id} className="rounded-md bg-muted p-2 text-sm">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{comment.author_profile?.full_name ?? '—'}</span>
            <span>{format(parseISO(comment.created_at), 'd. MMM yyyy HH:mm', { locale: nb })}</span>
          </div>
          <p className="mt-1">{comment.content}</p>
        </div>
      ))}
    </div>
  )
}
