import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { format, parseISO } from 'date-fns'
import { nb } from 'date-fns/locale'
import { LogOut, Mail, Phone, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { signOut } from '@/features/auth/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

const roleVariantMap: Record<string, 'default' | 'secondary'> = {
  janitor: 'default',
  manager: 'secondary',
  admin: 'secondary',
  customer: 'secondary',
}

const roleLabelMap: Record<string, string> = {
  janitor: 'Vaktmester',
  manager: 'Driftsleder',
  admin: 'Administrator',
  customer: 'Kunde',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProfilePage() {
  const { t } = useTranslation('janitor')
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const setProfile = useAuthStore((s) => s.setProfile)
  const [signingOut, setSigningOut] = useState(false)
  const [updatingGps, setUpdatingGps] = useState(false)
  const [updatingPhoto, setUpdatingPhoto] = useState(false)

  if (!profile) return null

  const hasGpsConsent = profile.gps_consent_at != null
  const hasPhotoConsent = profile.photo_consent_at != null

  async function handleGpsToggle(checked: boolean) {
    if (!profile) return
    setUpdatingGps(true)
    try {
      const newValue = checked ? new Date().toISOString() : null
      const { error } = await supabase
        .from('profiles')
        .update({ gps_consent_at: newValue })
        .eq('id', profile.id)

      if (!error) {
        setProfile({ ...profile, gps_consent_at: newValue })
      }
    } finally {
      setUpdatingGps(false)
    }
  }

  async function handlePhotoToggle(checked: boolean) {
    if (!profile) return
    setUpdatingPhoto(true)
    try {
      const newValue = checked ? new Date().toISOString() : null
      const { error } = await supabase
        .from('profiles')
        .update({ photo_consent_at: newValue })
        .eq('id', profile.id)

      if (!error) {
        setProfile({ ...profile, photo_consent_at: newValue })
      }
    } finally {
      setUpdatingPhoto(false)
    }
  }

  async function handleSignOut() {
    const confirmed = window.confirm(t('profile.signOutConfirm'))
    if (!confirmed) return

    setSigningOut(true)
    try {
      await signOut()
      navigate('/login')
    } catch {
      setSigningOut(false)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t('profile.title')}</h1>

      {/* Profile card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-coor-blue-500 text-xl font-bold text-white">
              {getInitials(profile.full_name)}
            </div>

            {/* Name + role */}
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-xl font-semibold">{profile.full_name}</h2>
              <Badge variant={roleVariantMap[profile.role] ?? 'secondary'} className="mt-1">
                {roleLabelMap[profile.role] ?? profile.role}
              </Badge>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Contact details */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">{t('profile.email')}</p>
                <p className="font-medium">{profile.email}</p>
              </div>
            </div>

            {profile.phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('profile.phone')}</p>
                  <p className="font-medium">{profile.phone}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preferences card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" />
            {t('profile.preferences')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pb-6">
          {/* GPS consent */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{t('profile.gpsConsent')}</p>
              <p className="text-xs text-muted-foreground">
                {t('profile.gpsConsentDescription')}
              </p>
              {hasGpsConsent && profile.gps_consent_at && (
                <p className="mt-0.5 text-xs text-coor-green-500">
                  {t('profile.consentGiven')}{' '}
                  {format(parseISO(profile.gps_consent_at), 'd. MMM yyyy', { locale: nb })}
                </p>
              )}
            </div>
            <Switch
              checked={hasGpsConsent}
              onCheckedChange={handleGpsToggle}
              disabled={updatingGps}
              className="min-h-[44px] min-w-[44px]"
              aria-label={t('profile.gpsConsent')}
            />
          </div>

          <Separator />

          {/* Photo consent */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{t('profile.photoConsent')}</p>
              <p className="text-xs text-muted-foreground">
                {t('profile.photoConsentDescription')}
              </p>
              {hasPhotoConsent && profile.photo_consent_at && (
                <p className="mt-0.5 text-xs text-coor-green-500">
                  {t('profile.consentGiven')}{' '}
                  {format(parseISO(profile.photo_consent_at), 'd. MMM yyyy', { locale: nb })}
                </p>
              )}
            </div>
            <Switch
              checked={hasPhotoConsent}
              onCheckedChange={handlePhotoToggle}
              disabled={updatingPhoto}
              className="min-h-[44px] min-w-[44px]"
              aria-label={t('profile.photoConsent')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Sign out */}
      <Button
        variant="destructive"
        className="min-h-[44px] w-full"
        onClick={handleSignOut}
        disabled={signingOut}
      >
        <LogOut className="mr-2 h-4 w-4" />
        {signingOut ? '...' : t('profile.signOut')}
      </Button>
    </div>
  )
}
