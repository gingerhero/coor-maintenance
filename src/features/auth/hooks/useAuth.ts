import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { Profile } from '@/types/database'

export function useAuth() {
  const { profile, isLoading, setProfile, setLoading, reset } = useAuthStore()

  useEffect(() => {
    let mounted = true

    async function loadProfile() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        if (mounted) setProfile(null)
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (mounted) {
        setProfile((data as Profile) ?? null)
      }
    }

    loadProfile()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        if (mounted) reset()
        return
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (mounted) {
          setProfile((data as Profile) ?? null)
        }
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
