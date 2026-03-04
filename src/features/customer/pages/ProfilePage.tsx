import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LogOut, Mail, Phone, Globe } from 'lucide-react'

import { useAuthStore } from '@/stores/authStore'
import { signOut } from '@/features/auth/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CustomerProfilePage() {
  const { t } = useTranslation('customer')
  const { t: tc } = useTranslation('common')
  const { i18n } = useTranslation()
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const [signingOut, setSigningOut] = useState(false)

  if (!profile) return null

  function handleLanguageChange(lng: string) {
    i18n.changeLanguage(lng)
    localStorage.setItem('language', lng)
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
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">{t('profile.title')}</h1>

      {/* Profile card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('profile.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xl font-semibold">{profile.full_name}</p>
            <Badge variant="secondary" className="mt-1">
              {tc(`roles.${profile.role}`)}
            </Badge>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="font-medium">{profile.email}</p>
            </div>

            {profile.phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                <p className="font-medium">{profile.phone}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Language preference */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4" />
            {t('profile.language')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={i18n.language} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nb">{t('profile.languageNb')}</SelectItem>
              <SelectItem value="en">{t('profile.languageEn')}</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Sign out */}
      <Button
        variant="destructive"
        className="w-full"
        onClick={handleSignOut}
        disabled={signingOut}
      >
        <LogOut className="mr-2 h-4 w-4" />
        {signingOut ? '...' : t('profile.signOut')}
      </Button>
    </div>
  )
}
