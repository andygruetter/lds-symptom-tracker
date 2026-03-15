'use client'

import { useTransition, useState } from 'react'

import { Check, Copy, Mail, Share2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  createSharingLinkAction,
  updateSharingLinkEmailAction,
} from '@/lib/actions/sharing-actions'
import { buildMailtoLink } from '@/lib/utils/sharing-email'
import { isValidEmail } from '@/types/sharing'
import type { AccessDuration, DateRange, SharingLink } from '@/types/sharing'

type Phase = 'selecting' | 'result'

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  '1m': 'Letzter 1 Monat',
  '3m': 'Letzte 3 Monate',
  '6m': 'Letzte 6 Monate',
  '12m': 'Letzte 12 Monate',
  custom: 'Individuell',
}

const ACCESS_DURATION_LABELS: Record<AccessDuration, string> = {
  '24h': '24 Stunden',
  '48h': '48 Stunden',
  '7d': '7 Tage',
}

export function ShareSheet() {
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<Phase>('selecting')
  const [dateRange, setDateRange] = useState<DateRange | ''>('')
  const [accessDuration, setAccessDuration] = useState<AccessDuration>('24h')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [shareLink, setShareLink] = useState<SharingLink | null>(null)
  const [copied, setCopied] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [isPending, startTransition] = useTransition()

  const isCustom = dateRange === 'custom'
  const isButtonActive =
    dateRange !== '' && (!isCustom || (customFrom !== '' && customTo !== ''))

  const isEmailInvalid = recipientEmail !== '' && !isValidEmail(recipientEmail)

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) {
      setTimeout(() => {
        setPhase('selecting')
        setDateRange('')
        setAccessDuration('24h')
        setCustomFrom('')
        setCustomTo('')
        setShareLink(null)
        setCopied(false)
        setErrorMsg('')
        setRecipientEmail('')
        setEmailError('')
      }, 300)
    }
  }

  function handleGenerate() {
    if (!isButtonActive) return
    setErrorMsg('')

    startTransition(async () => {
      const result = await createSharingLinkAction({
        dateRange: dateRange as DateRange,
        accessDuration,
        customFrom: isCustom ? customFrom : undefined,
        customTo: isCustom ? customTo : undefined,
        recipientEmail: recipientEmail || undefined,
      })

      if (result.error) {
        setErrorMsg('Link-Generierung fehlgeschlagen. Bitte erneut versuchen.')
        return
      }

      setShareLink(result.data)
      setPhase('result')
    })
  }

  function handleCopy() {
    if (!shareLink) return
    navigator.clipboard.writeText(shareLink.shareUrl).then(
      () => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      },
      () => {
        // Clipboard API fehlgeschlagen (Permissions/Focus)
      },
    )
  }

  function handleEmailBlur() {
    const trimmed = recipientEmail.trim()
    if (trimmed !== recipientEmail) {
      setRecipientEmail(trimmed)
    }
    if (trimmed !== '' && !isValidEmail(trimmed)) {
      setEmailError('Bitte gültige E-Mail-Adresse eingeben')
    } else {
      setEmailError('')
    }
  }

  function handleEmailChange(e: React.ChangeEvent<HTMLInputElement>) {
    setRecipientEmail(e.target.value)
    if (emailError && isValidEmail(e.target.value)) {
      setEmailError('')
    }
  }

  function handleEmailKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
    }
  }

  function handleSendEmail() {
    if (!shareLink) return
    const email = recipientEmail.trim()

    // E-Mail in DB speichern (fire-and-forget)
    if (email && isValidEmail(email)) {
      updateSharingLinkEmailAction(shareLink.id, email)
    }

    window.location.href = buildMailtoLink({
      recipientEmail: email || undefined,
      sharingUrl: shareLink.shareUrl,
      dateFrom: shareLink.dateFrom,
      dateTo: shareLink.dateTo,
      accessDuration,
    })
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <button
        onClick={() => setOpen(true)}
        className="flex min-h-[44px] items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity active:opacity-80"
        aria-label="Daten für Arzt teilen"
      >
        <Share2 className="size-4" />
        Für Arzt teilen
      </button>

      <SheetContent>
        <SheetHeader>
          <SheetTitle>Für Arzt teilen</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {phase === 'selecting' ? (
            <div className="mt-2 space-y-5">
              {/* Schritt 1: Datenzeitraum */}
              <div className="space-y-2">
                <label
                  htmlFor="share-date-range"
                  className="text-sm font-medium"
                >
                  Datenzeitraum
                </label>
                <Select
                  id="share-date-range"
                  value={dateRange}
                  onChange={(e) =>
                    setDateRange(e.target.value as DateRange | '')
                  }
                  disabled={isPending}
                >
                  <option value="" disabled>
                    Zeitraum wählen …
                  </option>
                  {(
                    Object.entries(DATE_RANGE_LABELS) as [DateRange, string][]
                  ).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>

                {/* Individuell: Von-Bis Inputs */}
                {isCustom && (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label
                        htmlFor="share-custom-from"
                        className="text-xs text-muted-foreground"
                      >
                        Von
                      </label>
                      <input
                        id="share-custom-from"
                        type="date"
                        value={customFrom}
                        onChange={(e) => setCustomFrom(e.target.value)}
                        disabled={isPending}
                        className="border-input bg-background text-foreground w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label
                        htmlFor="share-custom-to"
                        className="text-xs text-muted-foreground"
                      >
                        Bis
                      </label>
                      <input
                        id="share-custom-to"
                        type="date"
                        value={customTo}
                        onChange={(e) => setCustomTo(e.target.value)}
                        disabled={isPending}
                        className="border-input bg-background text-foreground w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Schritt 2: Zugriffsdauer */}
              <div className="space-y-2">
                <label
                  htmlFor="share-access-duration"
                  className="text-sm font-medium"
                >
                  Zugriffsdauer
                </label>
                <Select
                  id="share-access-duration"
                  value={accessDuration}
                  onChange={(e) =>
                    setAccessDuration(e.target.value as AccessDuration)
                  }
                  disabled={isPending}
                >
                  {(
                    Object.entries(ACCESS_DURATION_LABELS) as [
                      AccessDuration,
                      string,
                    ][]
                  ).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>

              {errorMsg && (
                <p className="text-sm text-destructive">{errorMsg}</p>
              )}

              <Button
                className="w-full"
                disabled={!isButtonActive || isPending}
                onClick={handleGenerate}
                type="button"
              >
                {isPending ? 'Link wird generiert …' : 'Link generieren'}
              </Button>
            </div>
          ) : (
            /* Phase: result */
            <div className="mt-2 space-y-4">
              <SheetDescription>
                Ihr Sharing-Link wurde erstellt. Kopieren Sie ihn oder senden
                Sie ihn per E-Mail.
              </SheetDescription>

              {/* Zusammenfassung (visuell reduziert) */}
              <div className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                <span>
                  {DATE_RANGE_LABELS[dateRange as DateRange]} ·{' '}
                  {ACCESS_DURATION_LABELS[accessDuration]} gültig
                </span>
              </div>

              {/* Link */}
              <div className="space-y-3">
                <div className="break-all rounded-lg border bg-card px-3 py-3 text-sm font-mono text-foreground">
                  {shareLink?.shareUrl}
                </div>

                {/* E-Mail-Input */}
                <div className="space-y-1">
                  <Input
                    id="share-recipient-email"
                    type="email"
                    value={recipientEmail}
                    onChange={handleEmailChange}
                    onBlur={handleEmailBlur}
                    onKeyDown={handleEmailKeyDown}
                    placeholder="E-Mail des Arztes (optional)"
                    aria-label="E-Mail des Arztes"
                    aria-describedby={
                      emailError ? 'share-email-error' : undefined
                    }
                  />
                  {emailError && (
                    <p
                      id="share-email-error"
                      className="text-xs text-destructive"
                    >
                      {emailError}
                    </p>
                  )}
                </div>

                <Button
                  className="w-full"
                  onClick={handleCopy}
                  type="button"
                  variant={copied ? 'secondary' : 'default'}
                >
                  {copied ? (
                    <>
                      <Check className="size-4" />
                      Kopiert!
                    </>
                  ) : (
                    <>
                      <Copy className="size-4" />
                      Link kopieren
                    </>
                  )}
                </Button>

                <Button
                  className="w-full"
                  variant="outline"
                  type="button"
                  disabled={isEmailInvalid}
                  onClick={handleSendEmail}
                >
                  <Mail className="size-4" />
                  Per E-Mail senden
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
