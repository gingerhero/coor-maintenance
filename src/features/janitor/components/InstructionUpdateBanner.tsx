import { useTranslation } from 'react-i18next'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  useUnacknowledgedInstructions,
  useAcknowledgeInstructions,
} from '@/features/assignments/hooks/useInstructionAcknowledgment'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Shows an amber banner when the janitor has unacknowledged instruction
 * updates. Clicking "Jeg forstar" marks all pending notifications as read.
 */
export function InstructionUpdateBanner() {
  const { t } = useTranslation('janitor')
  const { data: notifications } = useUnacknowledgedInstructions()
  const acknowledgeMutation = useAcknowledgeInstructions()

  if (!notifications?.length) return null

  const handleAcknowledge = () => {
    acknowledgeMutation.mutate({
      notificationIds: notifications.map((n) => n.id),
    })
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
      <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
      <p className="flex-1 text-sm font-medium text-amber-800 dark:text-amber-200">
        {t('instructionUpdate.banner')}
      </p>
      <Button
        size="sm"
        variant="outline"
        onClick={handleAcknowledge}
        disabled={acknowledgeMutation.isPending}
        className="shrink-0 border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/50"
      >
        {t('instructionUpdate.acknowledge')}
      </Button>
    </div>
  )
}
