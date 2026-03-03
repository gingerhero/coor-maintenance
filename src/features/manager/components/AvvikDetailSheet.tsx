import { useTranslation } from 'react-i18next'
import { format, parseISO } from 'date-fns'
import { nb } from 'date-fns/locale'
import { User, Calendar, MapPin, Image } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useUpdateAvvikStatus } from '@/features/avvik/hooks/useAvvik'
import { parseAvvikDescription } from '@/features/avvik/hooks/useAvvik'
import { useAvvikPhotoUrls } from '@/features/manager/hooks/useAvvikPhotos'
import { CommentThread } from '@/features/manager/components/CommentThread'
import { useAuthStore } from '@/stores/authStore'
import type { AvvikStatus } from '@/types/database'
import type { AvvikInboxItem } from '@/features/manager/hooks/useManagerAvvik'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AvvikDetailSheetProps {
  avvik: AvvikInboxItem | null
  open: boolean
  onClose: () => void
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
// Component
// ---------------------------------------------------------------------------

export function AvvikDetailSheet({
  avvik,
  open,
  onClose,
}: AvvikDetailSheetProps) {
  const { t } = useTranslation('manager')
  const updateStatus = useUpdateAvvikStatus()
  const { photos, isLoading: photosLoading } = useAvvikPhotoUrls(
    avvik?.id,
  )
  const userId = useAuthStore((s) => s.profile?.id)

  if (!avvik) return null

  const { title, body } = parseAvvikDescription(avvik.description)
  const dateFormatted = format(parseISO(avvik.created_at), 'd. MMM yyyy HH:mm', {
    locale: nb,
  })
  const reporterName = avvik.reported_by_profile?.full_name ?? '—'

  const nextStatuses: AvvikStatus[] = []
  if (avvik.status === 'new') nextStatuses.push('in_progress', 'resolved')
  if (avvik.status === 'in_progress') nextStatuses.push('resolved')

  function handleStatusChange(status: AvvikStatus) {
    updateStatus.mutate({
      id: avvik!.id,
      status,
      resolved_by: status === 'resolved' ? userId : undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="fixed inset-y-0 right-0 left-auto flex h-full w-full max-w-xl translate-x-0 translate-y-0 flex-col rounded-l-lg rounded-r-none border-l p-0 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-xl"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-border bg-background p-4">
          <DialogTitle className="text-lg font-semibold leading-tight">
            {title}
          </DialogTitle>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant={severityVariant(avvik.severity)}>
              {t(`avvikTimeline.severity.${avvik.severity}`)}
            </Badge>
            <Badge variant={statusVariant(avvik.status)}>
              {t(`avvikTimeline.status.${avvik.status}`)}
            </Badge>
          </div>

          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">
              {avvik.property.name}
            </p>
            <p className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {t('avvikInbox.reporter')}: {reporterName}
            </p>
            <p className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {dateFormatted}
            </p>
            {avvik.ns3451_code && (
              <p>
                <span className="font-medium">NS 3451:</span>{' '}
                {avvik.ns3451_code}
              </p>
            )}
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-6">
            {/* Description */}
            {body && (
              <div>
                <h4 className="mb-1 text-sm font-semibold">
                  {t('avvikInbox.description')}
                </h4>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {body}
                </p>
              </div>
            )}

            {/* Location */}
            {avvik.location_description && (
              <div>
                <h4 className="mb-1 flex items-center gap-1 text-sm font-semibold">
                  <MapPin className="h-3.5 w-3.5" />
                  {t('avvikInbox.location')}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {avvik.location_description}
                </p>
              </div>
            )}

            {/* Photos */}
            <div>
              <h4 className="mb-2 flex items-center gap-1 text-sm font-semibold">
                <Image className="h-3.5 w-3.5" />
                {t('avvikInbox.photos')}
              </h4>
              {photosLoading ? (
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} className="aspect-square w-full rounded-md" />
                  ))}
                </div>
              ) : photos.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t('avvikInbox.noPhotos')}
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {photos.map((photo) => (
                    <img
                      key={photo.id}
                      src={photo.url}
                      alt=""
                      className="aspect-square w-full rounded-md object-cover"
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Comments */}
            <CommentThread avvikId={avvik.id} />
          </div>
        </div>

        {/* Footer with status buttons */}
        {nextStatuses.length > 0 && (
          <div className="sticky bottom-0 border-t border-border bg-background p-4">
            <div className="flex flex-wrap gap-2">
              {nextStatuses.map((status) => (
                <button
                  key={status}
                  type="button"
                  disabled={updateStatus.isPending}
                  className={cn(
                    'rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50',
                    status === 'resolved'
                      ? 'bg-coor-green-500/10 text-coor-green-700 hover:bg-coor-green-500/20'
                      : 'bg-coor-orange-500/10 text-coor-orange-700 hover:bg-coor-orange-500/20',
                  )}
                  onClick={() => handleStatusChange(status)}
                >
                  {status === 'resolved'
                    ? t('avvikInbox.resolve')
                    : t('avvikInbox.setInProgress')}
                </button>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
