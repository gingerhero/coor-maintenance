import { useTranslation } from 'react-i18next'

export function ManagerDashboardPage() {
  const { t } = useTranslation('manager')

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">{t('dashboard.title')}</h1>

      {/* KPI tiles placeholder */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPITile label={t('dashboard.completionRate')} value="—" />
        <KPITile label={t('dashboard.hoursUsed')} value="—" />
        <KPITile label={t('dashboard.openAvvik')} value="0" />
        <KPITile label={t('dashboard.staffingGaps')} value="0" />
      </div>

      <div className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground">
        <p>Eiendommer og oversiktsdata vises her.</p>
      </div>
    </div>
  )
}

function KPITile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  )
}
