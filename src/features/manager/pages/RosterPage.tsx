import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useProperties } from '@/features/properties/hooks/useProperties'
import { useAuthStore } from '@/stores/authStore'
import {
  useRosterEntries,
  useAllJanitors,
  type RosterEntryWithJanitor,
} from '@/features/manager/hooks/useRoster'
import {
  useSwapRequests,
  useApproveSwapRequest,
  useRejectSwapRequest,
} from '@/features/manager/hooks/useSwapRequests'
import { RosterTable } from '@/features/manager/components/RosterTable'
import { RosterEntryForm } from '@/features/manager/components/RosterEntryForm'
import { SwapRequestTable } from '@/features/manager/components/SwapRequestTable'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RosterPage() {
  const { t } = useTranslation('manager')
  const profile = useAuthStore((s) => s.profile)

  // State
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | undefined>()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<RosterEntryWithJanitor | null>(null)

  // Data
  const { data: properties } = useProperties()
  const { data: entries, isLoading: entriesLoading } = useRosterEntries(selectedPropertyId)
  const { data: janitors } = useAllJanitors()
  const { data: swapRequests, isLoading: swapsLoading } = useSwapRequests()

  const approveMutation = useApproveSwapRequest()
  const rejectMutation = useRejectSwapRequest()

  // Split swap requests into pending / resolved
  const pendingSwaps = useMemo(
    () => swapRequests?.filter((r) => r.status === 'pending') ?? [],
    [swapRequests],
  )
  const resolvedSwaps = useMemo(
    () => swapRequests?.filter((r) => r.status !== 'pending') ?? [],
    [swapRequests],
  )

  // Handlers
  function handleEditEntry(entry: RosterEntryWithJanitor) {
    setEditingEntry(entry)
    setDialogOpen(true)
  }

  function handleCreateEntry() {
    setEditingEntry(null)
    setDialogOpen(true)
  }

  function handleDialogClose() {
    setDialogOpen(false)
    setEditingEntry(null)
  }

  function handleApprove(id: string, note?: string, replacementId?: string) {
    if (!profile) return
    approveMutation.mutate({
      id,
      decided_by: profile.id,
      decision_note: note,
      to_janitor_id: replacementId,
    })
  }

  function handleReject(id: string, note?: string) {
    if (!profile) return
    rejectMutation.mutate({
      id,
      decided_by: profile.id,
      decision_note: note,
    })
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <h1 className="text-2xl font-bold">{t('roster.title')}</h1>

      {/* Property selector */}
      <div className="space-y-1.5">
        <Label>{t('roster.selectProperty')}</Label>
        <Select
          value={selectedPropertyId ?? ''}
          onValueChange={(v) => setSelectedPropertyId(v || undefined)}
        >
          <SelectTrigger className="max-w-sm">
            <SelectValue placeholder={t('roster.selectProperty')} />
          </SelectTrigger>
          <SelectContent>
            {properties?.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Roster entries */}
      {!selectedPropertyId ? (
        <EmptyState
          title={t('roster.noPropertySelected')}
        />
      ) : (
        <>
          {/* Action bar */}
          <div className="flex items-center justify-between">
            <div />
            <Button onClick={handleCreateEntry}>
              <Plus className="mr-2 h-4 w-4" />
              {t('roster.assign')}
            </Button>
          </div>

          <RosterTable
            entries={entries ?? []}
            onEditEntry={handleEditEntry}
            isLoading={entriesLoading}
          />

          {/* Dialog for create / edit */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingEntry ? t('roster.editEntry') : t('roster.assign')}
                </DialogTitle>
              </DialogHeader>
              <RosterEntryForm
                propertyId={selectedPropertyId}
                janitors={janitors ?? []}
                entry={editingEntry ?? undefined}
                onSuccess={handleDialogClose}
                onCancel={handleDialogClose}
              />
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* Absence reports section */}
      <Separator />

      <h2 className="text-xl font-semibold">{t('roster.absenceReports')}</h2>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            {t('roster.pendingTab')}
            {pendingSwaps.length > 0 && (
              <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-coor-orange-500 text-xs text-white">
                {pendingSwaps.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="resolved">{t('roster.resolvedTab')}</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <SwapRequestTable
            requests={pendingSwaps}
            onApprove={handleApprove}
            onReject={handleReject}
            isLoading={swapsLoading}
            emptyMessage={t('roster.noPendingAbsences')}
            janitors={janitors}
          />
        </TabsContent>

        <TabsContent value="resolved">
          <SwapRequestTable
            requests={resolvedSwaps}
            onApprove={handleApprove}
            onReject={handleReject}
            isLoading={swapsLoading}
            emptyMessage={t('roster.noResolvedAbsences')}
            janitors={janitors}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
