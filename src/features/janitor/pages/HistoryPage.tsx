import { useTranslation } from 'react-i18next'

export function JanitorHistoryPage() {
  const { t } = useTranslation('janitor')

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t('history.title')}</h1>
      <div className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground">
        <p>{t('history.noHistory')}</p>
      </div>
    </div>
  )
}
