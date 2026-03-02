import { useTranslation } from 'react-i18next'

export function CustomerDashboardPage() {
  const { t } = useTranslation('customer')

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t('dashboard.title')}</h1>
      <div className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground">
        <p>Dine eiendommer vises her.</p>
      </div>
    </div>
  )
}
