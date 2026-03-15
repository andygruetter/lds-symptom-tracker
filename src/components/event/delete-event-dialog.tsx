'use client'

import { useState } from 'react'

import { useRouter } from 'next/navigation'

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
import { deleteEvent } from '@/lib/actions/insights-actions'

interface DeleteEventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string
}

export function DeleteEventDialog({
  open,
  onOpenChange,
  eventId,
}: DeleteEventDialogProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setIsDeleting(true)
    setError(null)

    const result = await deleteEvent(eventId)

    if (result.error) {
      setError(result.error.error)
      setIsDeleting(false)
      return
    }

    router.push('/insights')
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
          <AlertDialogTitle>Event löschen?</AlertDialogTitle>
          <AlertDialogDescription>
            Dieser Event und alle zugehörigen Daten werden innerhalb von 30
            Tagen unwiderruflich gelöscht.
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
            {isDeleting ? 'Wird gelöscht...' : 'Ja, Event löschen'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
