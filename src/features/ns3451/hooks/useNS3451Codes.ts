import { useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery'
import type { NS3451Code } from '@/types/database'

/**
 * Query key factory for NS 3451 code queries.
 */
export const ns3451Keys = {
  all: ['ns3451-codes'] as const,
}

/**
 * Fetches all NS 3451 building element codes.
 *
 * These codes rarely change (they are an industry standard), so we cache
 * them with `staleTime: Infinity` -- the data is considered fresh for the
 * entire session. A manual `queryClient.invalidateQueries` call can still
 * force a refetch if needed.
 *
 * The raw list is returned as `codes`. For convenience the hook also
 * provides derived structures:
 *
 * - `codesByLevel`  -- Map from level number to codes at that level
 * - `codesByParent` -- Map from parent_code to its children
 * - `codeMap`       -- Map from code string to the full NS3451Code object
 */
export function useNS3451Codes() {
  const query = useSupabaseQuery(
    ns3451Keys.all,
    () =>
      supabase
        .from('ns3451_codes')
        .select('*')
        .order('code', { ascending: true })
        .returns<NS3451Code[]>(),
    {
      staleTime: Infinity,
    },
  )

  const codes = query.data ?? []

  const codesByLevel = useMemo(() => {
    const map = new Map<number, NS3451Code[]>()
    for (const code of codes) {
      const existing = map.get(code.level)
      if (existing) {
        existing.push(code)
      } else {
        map.set(code.level, [code])
      }
    }
    return map
  }, [codes])

  const codesByParent = useMemo(() => {
    const map = new Map<string, NS3451Code[]>()
    for (const code of codes) {
      if (code.parent_code) {
        const existing = map.get(code.parent_code)
        if (existing) {
          existing.push(code)
        } else {
          map.set(code.parent_code, [code])
        }
      }
    }
    return map
  }, [codes])

  const codeMap = useMemo(() => {
    const map = new Map<string, NS3451Code>()
    for (const code of codes) {
      map.set(code.code, code)
    }
    return map
  }, [codes])

  return {
    ...query,
    codes,
    codesByLevel,
    codesByParent,
    codeMap,
  }
}
