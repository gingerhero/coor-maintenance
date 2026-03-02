import { useTranslation } from 'react-i18next'

export function JanitorHomePage() {
  const { t } = useTranslation('janitor')

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t('home.title')}</h1>
      <div className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground">
        <p>{t('home.noAssignments')}</p>
        <p className="mt-2 text-sm">Oppdrag vises her når de er tildelt.</p>
      </div>
    </div>
  )
}
