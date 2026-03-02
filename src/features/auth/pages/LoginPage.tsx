import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { signIn } from '@/features/auth/hooks/useAuth'
import { getRoleHomePath } from '@/features/auth/components/RequireAuth'
import { useAuthStore } from '@/stores/authStore'

export function LoginPage() {
  const { t } = useTranslation('auth')
  const { t: tc } = useTranslation('common')
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await signIn(email, password)
      // Wait for auth state to update and profile to load
      const checkProfile = () => {
        const profile = useAuthStore.getState().profile
        if (profile) {
          navigate(getRoleHomePath(profile.role), { replace: true })
        } else {
          setTimeout(checkProfile, 100)
        }
      }
      checkProfile()
    } catch {
      setError(t('invalidCredentials'))
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-coor-blue-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img src="/coor_logo.svg" alt="Coor" className="mx-auto mb-4 h-12" />
          <h1 className="text-2xl font-bold text-coor-blue-900">{t('loginTitle')}</h1>
        </div>

        <form onSubmit={handleSubmit} className="rounded-lg bg-card p-6 shadow-lg">
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <div className="mb-4">
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              {t('email')}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('emailPlaceholder')}
              required
              autoComplete="email"
              className="w-full rounded-md border border-border px-3 py-2.5 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="mb-1 block text-sm font-medium">
              {t('password')}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('passwordPlaceholder')}
              required
              autoComplete="current-password"
              className="w-full rounded-md border border-border px-3 py-2.5 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-primary px-4 py-3 text-base font-medium text-primary-foreground transition-colors hover:bg-coor-blue-600 disabled:opacity-50"
          >
            {loading ? tc('loading') : t('login')}
          </button>

          <div className="mt-4 text-center">
            <button type="button" className="text-sm text-primary hover:underline">
              {t('forgotPassword')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
