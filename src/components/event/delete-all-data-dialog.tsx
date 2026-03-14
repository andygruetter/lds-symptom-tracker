'use client'

import { useState } from 'react'

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
  const [success, setSuccess] = useState<string | null>(null)

  async function handleDelete() {
    setIsDeleting(true)
    setError(null)
    setSuccess(null)

    const result = await deleteAllEvents()

    if (result.error) {
      setError(result.error.error)
      setIsDeleting(false)
      return
    }

    setSuccess(`${result.data.deletedCount} Events gelöscht`)
    setIsDeleting(false)

    // Dialog nach kurzer Anzeige schliessen
    setTimeout(() => {
      onOpenChange(false)
      setSuccess(null)
    }, 1500)
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      setError(null)
      setIsDeleting(false)
      setSuccess(null)
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
        {success && <p className="text-sm text-green-600">{success}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isDeleting || success !== null}
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
