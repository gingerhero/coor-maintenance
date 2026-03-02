import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { nb } from 'date-fns/locale'
import {
  Building2,
  MapPin,
  Clock,
  CheckCircle2,
  Navigation,
  ClipboardList,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { useAssignment, useCheckIn } from '@/features/assignments/hooks/useAssignments'
import { useGPS } from '@/hooks/useGPS'
import { useVisitStore } from '@/stores/visitStore'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimer(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600)
  const mins = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60
  return [hrs, mins, secs].map((n) => String(n).padStart(2, '0')).join(':')
}

function formatTimeWindow(start: string | null, end: string | null): string {
  if (!start && !end) return ''
  const fmt = (t: string) => t.slice(0, 5)
  if (start && end) return `${fmt(start)} - ${fmt(end)}`
  if (start) return fmt(start)
  return fmt(end!)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VisitPage() {
  const { t } = useTranslation('janitor')
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: assignment, isLoading: assignmentLoading } = useAssignment(id)
  const checkInMutation = useCheckIn()
  const { requestPosition, permissionState, isLoading: gpsLoading } = useGPS()

  const {
    activeAssignmentId,
    timerRunning,
    elapsedSeconds,
    checkinTime,
    startVisit,
    setElapsedSeconds,
  } = useVisitStore()

  const [note, setNote] = useState('')
  const [checkingIn, setCheckingIn] = useState(false)

  // If we navigate to a visit that is already in_progress and matches the
  // active assignment in the store, the timer is already running.
  // If the assignment is in_progress but NOT in the store (e.g. page refresh),
  // we restore the timer from the assignment's checkin_at.
  useEffect(() => {
    if (
      assignment &&
      assignment.status === 'in_progress' &&
      assignment.checkin_at &&
      activeAssignmentId !== assignment.id
    ) {
      const checkinDate = new Date(assignment.checkin_at)
      const elapsed = Math.floor((Date.now() - checkinDate.getTime()) / 1000)
      startVisit(assignment.id, null)
      setElapsedSeconds(Math.max(0, elapsed))
    }
  }, [assignment, activeAssignmentId, startVisit, setElapsedSeconds])

  // Timer tick
  useEffect(() => {
    if (!timerRunning) return
    const interval = setInterval(() => {
      setElapsedSeconds(elapsedSeconds + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [timerRunning, elapsedSeconds, setElapsedSeconds])

  // ------------------------------------------------------------------
  // Check-in handler
  // ------------------------------------------------------------------

  const handleCheckIn = useCallback(async () => {
    if (!id) return
    setCheckingIn(true)

    try {
      let lat: number | null = null
      let lng: number | null = null
      let accuracy: number | null = null

      try {
        const pos = await requestPosition()
        lat = pos.latitude
        lng = pos.longitude
        accuracy = pos.accuracy
      } catch {
        // GPS is optional; proceed without coordinates
      }

      await checkInMutation.mutateAsync({
        id,
        checkin_lat: lat,
        checkin_lng: lng,
        checkin_accuracy: accuracy,
        checkin_note: note || null,
      })

      startVisit(id, lat != null && lng != null ? { lat, lng, accuracy: accuracy ?? 0 } : null)
    } finally {
      setCheckingIn(false)
    }
  }, [id, note, requestPosition, checkInMutation, startVisit])

  // ------------------------------------------------------------------
  // Loading state
  // ------------------------------------------------------------------

  if (assignmentLoading || !assignment) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  const isScheduled = assignment.status === 'scheduled'
  const isInProgress = assignment.status === 'in_progress'
  const timeWindow = formatTimeWindow(assignment.scheduled_start, assignment.scheduled_end)

  // ------------------------------------------------------------------
  // State A: Before check-in
  // ------------------------------------------------------------------

  if (isScheduled) {
    return (
      <div className="space-y-6">
        {/* Property header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-xl font-bold">{assignment.property.name}</h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            <span>{assignment.property.address}</span>
          </div>
        </div>

        {/* Details card */}
        <Card>
          <CardContent className="space-y-3 p-4">
            {timeWindow && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{timeWindow}</span>
              </div>
            )}
            {assignment.property.estimated_weekly_hours != null && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {t('visit.budgetedTime')}: {assignment.property.estimated_weekly_hours}t
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                {format(new Date(assignment.scheduled_date + 'T00:00:00'), 'EEEE d. MMMM', {
                  locale: nb,
                })}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* GPS status */}
        <div className="flex items-center gap-2 text-sm">
          <Navigation
            className={cn(
              'h-4 w-4',
              permissionState === 'granted'
                ? 'text-coor-green-500'
                : permissionState === 'denied'
                  ? 'text-destructive'
                  : 'text-muted-foreground',
            )}
          />
          <span className="text-muted-foreground">
            {permissionState === 'granted'
              ? 'GPS klar'
              : permissionState === 'denied'
                ? 'GPS nektet'
                : 'GPS venter'}
          </span>
        </div>

        {/* Note field */}
        <div>
          <label htmlFor="checkin-note" className="mb-1.5 block text-sm font-medium">
            {t('visit.addNote')}
          </label>
          <textarea
            id="checkin-note"
            rows={3}
            className={cn(
              'w-full rounded-md border border-border bg-background px-3 py-2 text-sm',
              'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-coor-blue-500',
            )}
            placeholder={t('visit.addNote')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {/* Check-in button */}
        <Button
          size="lg"
          className="h-14 w-full text-lg font-semibold"
          onClick={handleCheckIn}
          disabled={checkingIn || gpsLoading}
        >
          {checkingIn ? (
            <>
              <Spinner size="sm" className="text-white" />
              <span>{t('visit.checkIn')}...</span>
            </>
          ) : (
            t('visit.checkIn')
          )}
        </Button>
      </div>
    )
  }

  // ------------------------------------------------------------------
  // State B: Checked in (in_progress)
  // ------------------------------------------------------------------

  if (isInProgress) {
    const budgetedMinutes = (assignment.property.estimated_weekly_hours ?? 0) * 60
    const actualMinutes = Math.floor(elapsedSeconds / 60)

    return (
      <div className="space-y-6">
        {/* Property header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-xl font-bold">{assignment.property.name}</h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            <span>{assignment.property.address}</span>
          </div>
        </div>

        {/* Checked-in badge */}
        <div className="flex items-center gap-2">
          <Badge variant="success" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {t('visit.checkedIn')}
          </Badge>
          {(assignment.checkin_at ?? checkinTime) && (
            <span className="text-sm text-muted-foreground">
              {format(
                new Date(assignment.checkin_at ?? checkinTime!),
                'HH:mm',
              )}
            </span>
          )}
        </div>

        {/* Timer */}
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-6">
            <span className="text-sm font-medium text-muted-foreground">
              {t('visit.timer')}
            </span>
            <span className="font-mono text-4xl font-bold tabular-nums">
              {formatTimer(elapsedSeconds)}
            </span>
          </CardContent>
        </Card>

        {/* Budget comparison */}
        <Card>
          <CardContent className="space-y-2 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('visit.actualTime')}</span>
              <span className="font-medium">
                {actualMinutes} {t('visit.minutes')}
              </span>
            </div>
            {budgetedMinutes > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('visit.budgetedTime')}</span>
                <span className="font-medium">
                  {budgetedMinutes} {t('visit.minutes')}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Check-in note */}
        {assignment.checkin_note && (
          <Card>
            <CardContent className="p-4">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">
                {t('visit.addNote')}
              </span>
              <p className="text-sm">{assignment.checkin_note}</p>
            </CardContent>
          </Card>
        )}

        {/* Quick actions */}
        <div className="space-y-3">
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => navigate(`/janitor/visit/${id}/checklist`)}
          >
            <ClipboardList className="h-5 w-5" />
            {t('checklist.title')}
          </Button>

          <Button
            variant="secondary"
            size="lg"
            className="w-full"
            onClick={() => navigate(`/janitor/visit/${id}/checkout`)}
          >
            {t('visit.checkOut')}
          </Button>
        </div>
      </div>
    )
  }

  // ------------------------------------------------------------------
  // Completed / Cancelled fallback
  // ------------------------------------------------------------------

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-bold">{assignment.property.name}</h1>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 shrink-0" />
          <span>{assignment.property.address}</span>
        </div>
      </div>

      <Badge variant="secondary">{assignment.status}</Badge>
    </div>
  )
}
