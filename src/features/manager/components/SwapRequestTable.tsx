import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { format, parseISO } from 'date-fns'
import { nb } from 'date-fns/locale'
import { Check, X, User, Calendar } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { SwapRequestWithProfiles } from '@/features/manager/hooks/useSwapRequests'
import type { Profile } from '@/types/database'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function absenceStatusVariant(status: string) {
  switch (status) {
    case 'pending':
      return 'warning' as const
    case 'approved':
      return 'success' as const
    case 'rejected':
      return 'destructive' as const
    default:
      return 'secondary' as const
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SwapRequestTableProps {
  requests: SwapRequestWithProfiles[]
  onApprove: (id: string, note?: string, replacementId?: string) => void
  onReject: (id: string, note?: string) => void
  isLoading: boolean
  emptyMessage?: string
  janitors?: Pick<Profile, 'id' | 'full_name'>[]
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SwapRequestTable({
  requests,
  onApprove,
  onReject,
  isLoading,
  emptyMessage,
  janitors,
}: SwapRequestTableProps) {
  const { t } = useTranslation('manager')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedAction, setExpandedAction] = useState<'approve' | 'reject' | null>(null)
  const [decisionNote, setDecisionNote] = useState('')
  const [replacementId, setReplacementId] = useState<string | undefined>()

  function handleExpand(action: 'approve' | 'reject', id: string) {
    if (expandedId === id && expandedAction === action) {
      // Confirm action
      if (action === 'approve') {
        onApprove(id, decisionNote || undefined, replacementId)
      } else {
        onReject(id, decisionNote || undefined)
      }
      resetExpanded()
    } else {
      setExpandedId(id)
      setExpandedAction(action)
      setDecisionNote('')
      setReplacementId(undefined)
    }
  }

  function resetExpanded() {
    setExpandedId(null)
    setExpandedAction(null)
    setDecisionNote('')
    setReplacementId(undefined)
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (!requests || requests.length === 0) {
    return (
      <EmptyState
        title={emptyMessage ?? t('roster.noPendingAbsences')}
      />
    )
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden sm:block">
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  {t('roster.columns.fromJanitor')}
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  {t('roster.columns.absenceType')}
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  {t('roster.columns.period')}
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  {t('roster.columns.reason')}
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  {t('roster.columns.status')}
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  {t('roster.columns.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {requests.map((req) => (
                <tr key={req.id} className="transition-colors hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium">
                    {req.from_janitor.full_name}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={req.absence_type === 'sick' ? 'destructive' : 'secondary'}>
                      {t(`roster.absenceTypes.${req.absence_type ?? 'other'}`)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {format(parseISO(req.date_from), 'd. MMM', { locale: nb })}
                    {' – '}
                    {format(parseISO(req.date_to), 'd. MMM yyyy', { locale: nb })}
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-muted-foreground">
                    {req.reason}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={absenceStatusVariant(req.status)}>
                      {t(`roster.absenceStatus.${req.status}`)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {req.status === 'pending' ? (
                      <div className="space-y-2">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-coor-green-500 hover:text-coor-green-600"
                            onClick={() => handleExpand('approve', req.id)}
                          >
                            <Check className="mr-1 h-4 w-4" />
                            {t('roster.approve')}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive/80"
                            onClick={() => handleExpand('reject', req.id)}
                          >
                            <X className="mr-1 h-4 w-4" />
                            {t('roster.reject')}
                          </Button>
                        </div>
                        {expandedId === req.id && (
                          <div className="space-y-2">
                            {expandedAction === 'approve' && janitors && janitors.length > 0 && (
                              <Select
                                value={replacementId ?? '__none__'}
                                onValueChange={(v) =>
                                  setReplacementId(v === '__none__' ? undefined : v)
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder={t('roster.replacementJanitor')} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">
                                    {t('roster.noReplacement')}
                                  </SelectItem>
                                  {janitors
                                    .filter((j) => j.id !== req.from_janitor_id)
                                    .map((j) => (
                                      <SelectItem key={j.id} value={j.id}>
                                        {j.full_name}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            )}
                            <Textarea
                              value={decisionNote}
                              onChange={(e) => setDecisionNote(e.target.value)}
                              placeholder={t('roster.decisionNote')}
                              className="min-h-[60px]"
                            />
                            <Button
                              size="sm"
                              onClick={() => {
                                if (expandedAction === 'approve') {
                                  onApprove(req.id, decisionNote || undefined, replacementId)
                                } else {
                                  onReject(req.id, decisionNote || undefined)
                                }
                                resetExpanded()
                              }}
                            >
                              {t('roster.confirmAction')}
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {req.to_janitor && (
                          <p className="text-xs text-muted-foreground">
                            {t('roster.replacementJanitor')}: {req.to_janitor.full_name}
                          </p>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {req.decision_note ?? '—'}
                        </span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 sm:hidden">
        {requests.map((req) => (
          <div
            key={req.id}
            className="rounded-lg border border-border p-4"
          >
            <div className="flex items-center justify-between">
              <Badge variant={absenceStatusVariant(req.status)}>
                {t(`roster.absenceStatus.${req.status}`)}
              </Badge>
              <Badge variant={req.absence_type === 'sick' ? 'destructive' : 'secondary'}>
                {t(`roster.absenceTypes.${req.absence_type ?? 'other'}`)}
              </Badge>
            </div>

            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-3 w-3 text-muted-foreground" />
                <span className="font-medium">{req.from_janitor.full_name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>
                  {format(parseISO(req.date_from), 'd. MMM', { locale: nb })}
                  {' – '}
                  {format(parseISO(req.date_to), 'd. MMM yyyy', { locale: nb })}
                </span>
              </div>
            </div>

            <p className="mt-2 text-xs text-muted-foreground">{req.reason}</p>

            {req.status === 'pending' && (
              <div className="mt-3 space-y-2">
                {expandedId === req.id && (
                  <>
                    {expandedAction === 'approve' && janitors && janitors.length > 0 && (
                      <Select
                        value={replacementId ?? '__none__'}
                        onValueChange={(v) =>
                          setReplacementId(v === '__none__' ? undefined : v)
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t('roster.replacementJanitor')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">
                            {t('roster.noReplacement')}
                          </SelectItem>
                          {janitors
                            .filter((j) => j.id !== req.from_janitor_id)
                            .map((j) => (
                              <SelectItem key={j.id} value={j.id}>
                                {j.full_name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    )}
                    <Textarea
                      value={decisionNote}
                      onChange={(e) => setDecisionNote(e.target.value)}
                      placeholder={t('roster.decisionNote')}
                      className="min-h-[60px]"
                    />
                  </>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-coor-green-500"
                    onClick={() => handleExpand('approve', req.id)}
                  >
                    <Check className="mr-1 h-4 w-4" />
                    {expandedId === req.id && expandedAction === 'approve'
                      ? t('roster.confirmAction')
                      : t('roster.approve')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-destructive"
                    onClick={() => handleExpand('reject', req.id)}
                  >
                    <X className="mr-1 h-4 w-4" />
                    {expandedId === req.id && expandedAction === 'reject'
                      ? t('roster.confirmAction')
                      : t('roster.reject')}
                  </Button>
                </div>
              </div>
            )}

            {req.status !== 'pending' && (
              <div className="mt-2 space-y-1">
                {req.to_janitor && (
                  <p className="text-xs text-muted-foreground">
                    {t('roster.replacementJanitor')}: {req.to_janitor.full_name}
                  </p>
                )}
                {req.decision_note && (
                  <p className="text-xs italic text-muted-foreground">
                    {req.decision_note}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  )
}
