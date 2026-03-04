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
import { deleteAccount } from '@/lib/actions/account-actions'

interface DeleteAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteAccountDialog({
  open,
  onOpenChange,
}: DeleteAccountDialogProps) {
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setIsDeletingAccount(true)
    setError(null)

    const result = await deleteAccount()

    // Wenn wir hier ankommen, gab es einen Fehler
    // (Erfolg → redirect() throws intern)
    if (result.error) {
      setError(result.error.error)
      setIsDeletingAccount(false)
    }
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      setError(null)
      setIsDeletingAccount(false)
    }
    onOpenChange(isOpen)
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Account löschen?</AlertDialogTitle>
          <AlertDialogDescription>
            Dein Account und alle zugehörigen Daten werden innerhalb von 30
            Tagen unwiderruflich gelöscht. Du wirst sofort abgemeldet.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeletingAccount}>
            Abbrechen
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isDeletingAccount}
            onClick={(e) => {
              e.preventDefault()
              handleDelete()
            }}
          >
            {isDeletingAccount
              ? 'Account wird gelöscht...'
              : 'Ja, Account löschen'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
