import { useTranslation } from 'react-i18next'
import { AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IncompleteTasksDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  incompleteTasks: { description: string; ns3451Code?: string }[]
  onGoBack: () => void
  onConfirmCheckout: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Dialog shown when the janitor attempts to check out with incomplete tasks.
 *
 * Lists all tasks that have not been completed or skipped, and forces the
 * janitor to either go back to the checklist or explicitly confirm checkout.
 */
export function IncompleteTasksDialog({
  open,
  onOpenChange,
  incompleteTasks,
  onGoBack,
  onConfirmCheckout,
}: IncompleteTasksDialogProps) {
  const { t } = useTranslation('janitor')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-coor-orange-500" />
            <DialogTitle>{t('checkout.incompleteTasks')}</DialogTitle>
          </div>
          <DialogDescription>
            {t('checkout.incompleteMessage')}
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable task list */}
        <div className="max-h-60 overflow-y-auto rounded-md border border-border">
          <ul className="divide-y divide-border">
            {incompleteTasks.map((task, index) => (
              <li
                key={index}
                className="flex items-start gap-3 px-4 py-3"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-muted-foreground text-xs text-muted-foreground">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{task.description}</p>
                  {task.ns3451Code && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      NS 3451: {task.ns3451Code}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="secondary"
            size="lg"
            className="min-h-[44px] w-full sm:w-auto"
            onClick={onGoBack}
          >
            {t('checkout.goBack')}
          </Button>
          <Button
            variant="destructive"
            size="lg"
            className="min-h-[44px] w-full sm:w-auto"
            onClick={onConfirmCheckout}
          >
            {t('checkout.confirmCheckout')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
