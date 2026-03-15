'use client'

import { useTransition } from 'react'
import { useState } from 'react'

import { Check, Copy, LinkIcon } from 'lucide-react'
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { revokeSharingLinkAction } from '@/lib/actions/sharing-actions'
import type { SharingLinkListItem, SharingLinkStatus } from '@/types/sharing'

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-')
  return `${day}.${month}.${year}`
}

function formatExpiry(isoStr: string): string {
  const date = new Date(isoStr)
  return date.toLocaleString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function StatusBadge({ status }: { status: SharingLinkStatus }) {
  const styles: Record<SharingLinkStatus, string> = {
    active:
      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    expired: 'bg-muted text-muted-foreground',
    revoked: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }
  const labels: Record<SharingLinkStatus, string> = {
    active: 'Aktiv',
    expired: 'Abgelaufen',
    revoked: 'Widerrufen',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  )
}

function LinkCard({
  link,
  onRevoked,
}: {
  link: SharingLinkListItem
  onRevoked: (id: string) => void
}) {
  const [copied, setCopied] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleCopy() {
    navigator.clipboard.writeText(link.shareUrl).then(
      () => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      },
      () => {
        // Clipboard API fehlgeschlagen (Permissions/Focus)
      },
    )
  }

  function handleRevoke() {
    startTransition(async () => {
      const result = await revokeSharingLinkAction(link.id)
      if (!result.error) {
        onRevoked(link.id)
      } else {
        toast.error('Widerruf fehlgeschlagen', {
          description: result.error.error,
        })
      }
    })
  }

  return (
    <div className="flex items-start justify-between gap-3 px-4 py-3">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <StatusBadge status={link.status} />
          <span className="text-xs text-muted-foreground">
            Erstellt {formatDate(link.createdAt.slice(0, 10))}
          </span>
        </div>
        <p className="text-sm text-foreground">
          {formatDate(link.dateFrom)} – {formatDate(link.dateTo)}
        </p>
        {link.status === 'active' && (
          <p className="text-xs text-muted-foreground">
            Läuft ab: {formatExpiry(link.expiresAt)}
          </p>
        )}
        {link.status === 'expired' && (
          <p className="text-xs text-muted-foreground">
            Abgelaufen am {formatExpiry(link.expiresAt)}
          </p>
        )}
        {link.status === 'revoked' && link.revokedAt && (
          <p className="text-xs text-muted-foreground">
            Widerrufen am {formatExpiry(link.revokedAt)}
          </p>
        )}
        {link.recipientEmail && (
          <p className="max-w-[200px] truncate text-xs text-muted-foreground">
            An: {link.recipientEmail}
          </p>
        )}
      </div>

      <div className="mt-0.5 flex shrink-0 items-center gap-1">
        {link.status === 'active' && (
          <>
            <button
              onClick={handleCopy}
              aria-label="Link kopieren"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:bg-accent"
            >
              {copied ? (
                <Check className="size-4 text-green-600" />
              ) : (
                <Copy className="size-4" />
              )}
            </button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isPending}
                  aria-label="Link widerrufen"
                >
                  {isPending ? '...' : 'Widerrufen'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Link wirklich widerrufen?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Der Arzt kann danach nicht mehr auf die Daten zugreifen.
                    Diese Aktion kann nicht rückgängig gemacht werden.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleRevoke}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Widerrufen
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>
    </div>
  )
}

function sortLinks(links: SharingLinkListItem[]): SharingLinkListItem[] {
  const active = links.filter((l) => l.status === 'active')
  const rest = links
    .filter((l) => l.status !== 'active')
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  return [...active, ...rest]
}

export function SharingLinksList({
  links: initialLinks,
}: {
  links: SharingLinkListItem[]
}) {
  const [links, setLinks] = useState(initialLinks)

  function handleRevoked(id: string) {
    setLinks((prev) =>
      prev.map((l) =>
        l.id === id
          ? {
              ...l,
              status: 'revoked' as const,
              isActive: false,
              revokedAt: new Date().toISOString(),
            }
          : l,
      ),
    )
  }

  if (links.length === 0) {
    return (
      <div className="px-4 py-6 text-center">
        <LinkIcon className="mx-auto mb-2 size-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          Noch keine Links geteilt. Vor dem nächsten Arzttermin?
        </p>
      </div>
    )
  }

  const sorted = sortLinks(links)

  return (
    <div className="divide-y divide-border">
      {sorted.map((link) => (
        <LinkCard key={link.id} link={link} onRevoked={handleRevoked} />
      ))}
    </div>
  )
}
