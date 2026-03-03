import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Building2, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useProperties } from '@/features/properties/hooks/useProperties'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { PropertyTable, type PropertyRow } from '../components/PropertyTable'
import type { Assignment, Avvik } from '@/types/database'

// ---------------------------------------------------------------------------
// Hook: fetch summary data for all properties in one go
// ---------------------------------------------------------------------------

interface PropertySummary {
  propertyId: string
  lastVisitDate: string | null
  completionPercent: number
  openAvvikCount: number
}

function usePropertiesSummary(propertyIds: string[]) {
  return useQuery<PropertySummary[], Error>({
    queryKey: ['manager', 'properties-summary', propertyIds.join(',')],
    queryFn: async () => {
      if (propertyIds.length === 0) return []

      const [assignmentsResult, avvikResult] = await Promise.all([
        // All assignments for these properties
        supabase
          .from('assignments')
          .select('property_id, scheduled_date, status')
          .in('property_id', propertyIds)
          .order('scheduled_date', { ascending: false })
          .returns<
            Pick<Assignment, 'property_id' | 'scheduled_date' | 'status'>[]
          >(),

        // Open avvik grouped by property
        supabase
          .from('avvik')
          .select('property_id')
          .in('property_id', propertyIds)
          .neq('status', 'resolved')
          .returns<Pick<Avvik, 'property_id'>[]>(),
      ])

      if (assignmentsResult.error)
        throw new Error(assignmentsResult.error.message)
      if (avvikResult.error) throw new Error(avvikResult.error.message)

      const assignments = assignmentsResult.data ?? []
      const avvik = avvikResult.data ?? []

      // Group assignments by property
      const byProperty = new Map<
        string,
        { total: number; completed: number; lastDate: string | null }
      >()
      for (const a of assignments) {
        const entry = byProperty.get(a.property_id) ?? {
          total: 0,
          completed: 0,
          lastDate: null,
        }
        entry.total++
        if (a.status === 'completed') entry.completed++
        if (!entry.lastDate) entry.lastDate = a.scheduled_date
        byProperty.set(a.property_id, entry)
      }

      // Count open avvik per property
      const avvikCount = new Map<string, number>()
      for (const a of avvik) {
        avvikCount.set(a.property_id, (avvikCount.get(a.property_id) ?? 0) + 1)
      }

      return propertyIds.map((pid) => {
        const entry = byProperty.get(pid)
        return {
          propertyId: pid,
          lastVisitDate: entry?.lastDate ?? null,
          completionPercent:
            entry && entry.total > 0
              ? Math.round((entry.completed / entry.total) * 100)
              : 0,
          openAvvikCount: avvikCount.get(pid) ?? 0,
        }
      })
    },
    enabled: propertyIds.length > 0,
    staleTime: 5 * 60 * 1000,
  })
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function PropertiesListPage() {
  const { t } = useTranslation('manager')
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')

  const { data: properties, isLoading: propertiesLoading } = useProperties()
  const propertyIds = useMemo(
    () => (properties ?? []).map((p) => p.id),
    [properties],
  )
  const { data: summaries, isLoading: summariesLoading } =
    usePropertiesSummary(propertyIds)

  const isLoading = propertiesLoading || summariesLoading

  // Build property rows by merging properties with summaries
  const rows: PropertyRow[] = useMemo(() => {
    if (!properties) return []

    const summaryMap = new Map(
      (summaries ?? []).map((s) => [s.propertyId, s]),
    )

    return properties.map((p) => {
      const summary = summaryMap.get(p.id)
      return {
        id: p.id,
        name: p.name,
        address: p.address,
        lastVisitDate: summary?.lastVisitDate ?? null,
        completionPercent: summary?.completionPercent ?? 0,
        openAvvikCount: summary?.openAvvikCount ?? 0,
      }
    })
  }, [properties, summaries])

  // Filter by search query
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return rows
    const q = searchQuery.toLowerCase()
    return rows.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q),
    )
  }, [rows, searchQuery])

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">{t('dashboard.properties')}</h1>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('property.searchProperties')}
          className="pl-9"
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Building2 />}
          title={t('dashboard.noProperties')}
          description={t('dashboard.noPropertiesDescription')}
        />
      ) : (
        <PropertyTable
          properties={filtered}
          onPropertyClick={(id) => navigate(`/manager/properties/${id}`)}
        />
      )}
    </div>
  )
}
