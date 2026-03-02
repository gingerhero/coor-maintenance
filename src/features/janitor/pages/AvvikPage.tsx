import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, AlertTriangle, FileWarning } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { useMyAvvik, type AvvikWithReporter } from '@/features/avvik/hooks/useAvvik'
import { AvvikCard } from '@/features/avvik/components/AvvikCard'
import { AvvikForm } from '@/features/avvik/components/AvvikForm'
import { useProperties } from '@/features/properties/hooks/useProperties'
import type { Property } from '@/types/database'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AvvikPage() {
  const { t } = useTranslation('janitor')

  const { data: avvikList, isLoading: avvikLoading } = useMyAvvik()
  const { data: properties, isLoading: propertiesLoading } = useProperties()

  const [formOpen, setFormOpen] = useState(false)
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null)

  // ------------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------------

  const handleOpenForm = useCallback(() => {
    // If only one property, auto-select it
    if (properties?.length === 1) {
      setSelectedPropertyId(properties[0].id)
      setFormOpen(true)
    } else {
      // Show property picker first
      setSelectedPropertyId(null)
      setFormOpen(true)
    }
  }, [properties])

  const handleFormSuccess = useCallback(() => {
    setFormOpen(false)
    setSelectedPropertyId(null)
  }, [])

  const handleFormCancel = useCallback(() => {
    setFormOpen(false)
    setSelectedPropertyId(null)
  }, [])

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('avvik.pageTitle')}</h1>
        <Button onClick={handleOpenForm} size="lg">
          <Plus className="h-4 w-4" />
          {t('avvik.title')}
        </Button>
      </div>

      {/* Avvik list */}
      {avvikLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <Skeleton key={n} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      ) : !avvikList || avvikList.length === 0 ? (
        <EmptyState
          icon={<FileWarning />}
          title={t('avvik.noAvvik')}
          description={t('avvik.noAvvikDescription')}
        />
      ) : (
        <div className="space-y-3">
          {avvikList.map((avvik: AvvikWithReporter) => (
            <AvvikCard key={avvik.id} avvik={avvik} />
          ))}
        </div>
      )}

      {/* Full-screen dialog for creating avvik */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-full max-w-full flex-col rounded-none border-0 sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-lg sm:border">
          <DialogHeader>
            <DialogTitle>{t('avvik.title')}</DialogTitle>
            <DialogDescription className="sr-only">
              {t('avvik.title')}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-1">
            {/* Property selector (if multiple properties available) */}
            {!selectedPropertyId && properties && properties.length > 1 ? (
              <div className="space-y-4">
                <label className="text-sm font-medium">
                  Velg eiendom
                </label>
                <Select
                  value={selectedPropertyId ?? undefined}
                  onValueChange={(val) => setSelectedPropertyId(val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Velg eiendom..." />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((prop: Property) => (
                      <SelectItem key={prop.id} value={prop.id}>
                        {prop.name} - {prop.address}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : selectedPropertyId ? (
              <AvvikForm
                propertyId={selectedPropertyId}
                onSuccess={handleFormSuccess}
                onCancel={handleFormCancel}
              />
            ) : propertiesLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-11 w-full" />
              </div>
            ) : (
              <EmptyState
                icon={<AlertTriangle />}
                title="Ingen eiendommer tilgjengelig"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
