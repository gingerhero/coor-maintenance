import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { MapPin, AlertTriangle } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { useProperties } from '@/features/properties/hooks/useProperties'
import { useCustomerAvvikCounts } from '../hooks/useCustomerData'

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function CustomerDashboardPage() {
  const { t } = useTranslation('customer')
  const navigate = useNavigate()
  const { data: properties, isLoading: propsLoading } = useProperties()
  const { data: avvikRows } = useCustomerAvvikCounts()

  // Count open avvik per property
  const openCountByProperty = useMemo(() => {
    const map = new Map<string, number>()
    for (const row of avvikRows ?? []) {
      map.set(row.property_id, (map.get(row.property_id) ?? 0) + 1)
    }
    return map
  }, [avvikRows])

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t('dashboard.title')}</h1>

      {propsLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="mb-2 h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </Card>
          ))}
        </div>
      ) : !properties?.length ? (
        <EmptyState
          title={t('dashboard.noProperties')}
          description={t('dashboard.noPropertiesDescription')}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {properties.map((property) => {
            const openCount = openCountByProperty.get(property.id) ?? 0

            return (
              <Card
                key={property.id}
                className="cursor-pointer p-4 transition-shadow hover:shadow-md"
                onClick={() => navigate(`/customer/avvik?property=${property.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    navigate(`/customer/avvik?property=${property.id}`)
                  }
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{property.name}</p>
                    <p className="flex items-center gap-1 truncate text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      {property.address}
                    </p>
                  </div>
                  {openCount > 0 && (
                    <Badge variant="destructive" className="flex shrink-0 items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {openCount}
                    </Badge>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
