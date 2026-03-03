import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? 'http://localhost:54321'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

if (!supabaseAnonKey) {
  console.warn(
    'Missing VITE_SUPABASE_ANON_KEY — app will render but auth/data will not work. See .env.example',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Bypass navigator.locks which deadlocks in React StrictMode.
    // StrictMode double-mounts cause multiple getSession() calls that
    // queue on the same lock and never resolve. A no-op lock is safe
    // for a single-tab PWA.
    lock: async <R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> => {
      return await fn()
    },
  },
})
