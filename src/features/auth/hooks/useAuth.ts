import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { Profile } from '@/types/database'

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.warn('Failed to fetch profile:', error.message)
    return null
  }
  return data as Profile
}

// ---------------------------------------------------------------------------
// Module-level session initialization
// ---------------------------------------------------------------------------
// Runs once at import time, outside React's lifecycle. Both StrictMode
// mounts .then() on the same promise — no duplicate getSession() calls.
const authReady = supabase.auth
  .getSession()
  .then(async ({ data: { session } }) => {
    if (!session?.user) return null
    return fetchProfile(session.user.id)
  })
  .catch(() => null)

export function useAuth() {
  const { profile, isLoading, setProfile, setLoading, reset } = useAuthStore()

  useEffect(() => {
    let mounted = true

    // Read the module-level session result (already resolved or nearly so).
    authReady.then((profile) => {
      if (mounted) setProfile(profile)
    })

    // Listen for subsequent auth changes (sign in, sign out, token refresh).
    // Skip INITIAL_SESSION since authReady handles initialization above.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION') return
      if (!mounted) return

      if (event === 'SIGNED_OUT' || !session?.user) {
        reset()
        return
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const profile = await fetchProfile(session.user.id)
        if (mounted) setProfile(profile)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [setProfile, setLoading, reset])

  return { profile, isLoading }
}

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email)
  if (error) throw error
}
