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

export function useAuth() {
  const { profile, isLoading, setProfile, setLoading, reset } = useAuthStore()

  useEffect(() => {
    let mounted = true

    // Use getSession as the primary initialization method.
    // This avoids StrictMode race conditions with onAuthStateChange's
    // INITIAL_SESSION event (which may resolve after the first mount is torn down).
    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (!mounted) return

        if (!session?.user) {
          setProfile(null)
          return
        }

        const profile = await fetchProfile(session.user.id)
        if (mounted) setProfile(profile)
      } catch {
        if (mounted) setProfile(null)
      }
    }

    init()

    // Listen for subsequent auth changes (sign in, sign out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Skip INITIAL_SESSION — we handle that via getSession() above
      if (event === 'INITIAL_SESSION') return

      if (event === 'SIGNED_OUT' || !session?.user) {
        if (mounted) reset()
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
