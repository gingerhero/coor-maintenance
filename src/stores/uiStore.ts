import { create } from 'zustand'

type Theme = 'light' | 'dark' | 'system'

interface UIState {
  theme: Theme
  sidebarOpen: boolean
  setTheme: (theme: Theme) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  theme: 'system',
  sidebarOpen: false,
  setTheme: (theme) => set({ theme }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
}))
