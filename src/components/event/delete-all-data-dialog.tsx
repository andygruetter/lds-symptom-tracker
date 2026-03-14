'use client'

import { useState } from 'react'

import { toast } from 'sonner'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { deleteAllEvents } from '@/lib/actions/insights-actions'

interface DeleteAllDataDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteAllDataDialog({
  open,
  onOpenChange,
}: DeleteAllDataDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setIsDeleting(true)
    setError(null)

    const result = await deleteAllEvents()

    if (result.error) {
      setError(result.error.error)
      setIsDeleting(false)
      return
    }

    const count = result.data?.deletedCount ?? 0
    toast.success(
      count > 0
        ? `${count} Events gelöscht`
        : 'Keine Events zum Löschen vorhanden',
    )
    setIsDeleting(false)
    onOpenChange(false)
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      setError(null)
      setIsDeleting(false)
    }
    onOpenChange(isOpen)
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Alle Daten löschen?</AlertDialogTitle>
          <AlertDialogDescription>
            Alle deine Symptom-Events, Audio-Aufnahmen und Fotos werden
            innerhalb von 30 Tagen unwiderruflich gelöscht. Dein Account bleibt
            bestehen.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isDeleting}
            onClick={(e) => {
              e.preventDefault()
              handleDelete()
            }}
          >
            {isDeleting ? 'Daten werden gelöscht...' : 'Ja, alle Daten löschen'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
