'use client'

import { useCallback, useMemo, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useNS3451Codes } from '@/features/ns3451/hooks/useNS3451Codes'
import type { NS3451Code } from '@/types/database'
import { NS3451Browser } from './NS3451Browser'
import { NS3451Badge } from './NS3451Badge'
import { getCategoryColor } from './ns3451-colors'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NS3451CodePickerProps {
  /** Currently selected NS 3451 code string (e.g. "26"). */
  value?: string
  /** Called when the user confirms a selection. */
  onChange: (code: string) => void
  /** Optional label shown above the trigger button. */
  label?: string
  /** Optional className for the outermost wrapper. */
  className?: string
  /** If true, the trigger button shows an error ring. */
  error?: boolean
}

// ---------------------------------------------------------------------------
// Filtered search result list
// ---------------------------------------------------------------------------

function SearchResults({
  codes,
  query,
  selectedCode,
  onSelect,
}: {
  codes: NS3451Code[]
  query: string
  selectedCode: string | undefined
  onSelect: (code: NS3451Code) => void
}) {
  const lowerQuery = query.toLowerCase().trim()

  const filtered = useMemo(() => {
    if (!lowerQuery) return []
    return codes.filter((c) => {
      const haystack = `${c.code} ${c.title_nb} ${c.title_en ?? ''}`.toLowerCase()
      return haystack.includes(lowerQuery)
    })
  }, [codes, lowerQuery])

  if (filtered.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Ingen treff for &laquo;{query}&raquo;
      </p>
    )
  }

  return (
    <ul className="max-h-[50vh] space-y-1 overflow-y-auto" role="listbox">
      {filtered.map((code) => {
        const color = getCategoryColor(code.code)
        const isSelected = code.code === selectedCode
        return (
          <li key={code.id} role="option" aria-selected={isSelected}>
            <button
              type="button"
              onClick={() => onSelect(code)}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors',
                'border-l-2',
                color.border,
                'hover:bg-muted cursor-pointer',
                isSelected && 'bg-muted ring-2 ring-coor-blue-500 ring-offset-1',
              )}
            >
              <span
                className={cn('inline-block h-2.5 w-2.5 shrink-0 rounded-full', color.bgSolid)}
                aria-hidden
              />
              <span className="font-mono font-semibold">{code.code}</span>
              <span className="truncate">{code.title_nb}</span>
              {code.title_en && (
                <span className="truncate text-muted-foreground">({code.title_en})</span>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function NS3451CodePicker({
  value,
  onChange,
  label,
  className,
  error,
}: NS3451CodePickerProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [pendingCode, setPendingCode] = useState<NS3451Code | null>(null)

  const { codes, codeMap } = useNS3451Codes()

  // Resolve the full code object for the current value
  const selectedCodeObj = value ? codeMap.get(value) : undefined

  // When dialog opens, reset state
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        setSearchQuery('')
        // Pre-select the currently saved value
        setPendingCode(value ? (codeMap.get(value) ?? null) : null)
      }
      setOpen(nextOpen)
    },
    [value, codeMap],
  )

  const handleSelect = useCallback((code: NS3451Code) => {
    setPendingCode(code)
  }, [])

  const handleConfirm = useCallback(() => {
    if (pendingCode) {
      onChange(pendingCode.code)
    }
    setOpen(false)
  }, [pendingCode, onChange])

  const handleCancel = useCallback(() => {
    setOpen(false)
  }, [])

  const isSearching = searchQuery.trim().length > 0

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label className="text-sm font-medium text-foreground">{label}</label>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              'w-full justify-between font-normal',
              !selectedCodeObj && 'text-muted-foreground',
              error && 'border-destructive focus-visible:ring-destructive',
            )}
          >
            {selectedCodeObj ? (
              <NS3451Badge code={selectedCodeObj.code} codes={codes} />
            ) : (
              <span>Velg NS 3451-kode</span>
            )}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DialogTrigger>

        <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Velg NS 3451-kode</DialogTitle>
            <DialogDescription>
              Sok etter kode, norsk eller engelsk tittel.
            </DialogDescription>
          </DialogHeader>

          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Sok etter kode eller tittel..."
              className="pl-9"
              autoFocus
            />
          </div>

          {/* Content area */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {isSearching ? (
              <SearchResults
                codes={codes}
                query={searchQuery}
                selectedCode={pendingCode?.code}
                onSelect={handleSelect}
              />
            ) : (
              <NS3451Browser
                onSelect={handleSelect}
                selectedCode={pendingCode?.code}
              />
            )}
          </div>

          {/* Footer */}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCancel}>
              Avbryt
            </Button>
            <Button onClick={handleConfirm} disabled={!pendingCode}>
              Bekreft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
