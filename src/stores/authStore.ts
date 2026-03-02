import { create } from 'zustand'
import type { Profile, UserRole } from '@/types/database'

interface AuthState {
  profile: Profile | null
  isLoading: boolean
  setProfile: (profile: Profile | null) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  profile: null,
  isLoading: true,
  setProfile: (profile) => set({ profile, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () => set({ profile: null, isLoading: false }),
}))

export function useUserRole(): UserRole | null {
  return useAuthStore((s) => s.profile?.role ?? null)
}

export function useIsAuthenticated(): boolean {
  return useAuthStore((s) => s.profile !== null)
}
