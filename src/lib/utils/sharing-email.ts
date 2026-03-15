const SUBJECT = 'Symptom-Daten — Sharing-Link'

const ACCESS_DURATION_LABELS: Record<string, string> = {
  '24h': '24 Stunden',
  '48h': '48 Stunden',
  '7d': '7 Tage',
}

export interface MailtoParams {
  recipientEmail?: string
  sharingUrl: string
  dateFrom: string
  dateTo: string
  accessDuration: string
}

function formatDateDE(dateStr: string): string {
  const [year, month, day] = dateStr.split('-')
  return `${day}.${month}.${year}`
}

export function buildMailtoLink(params: MailtoParams): string {
  const { recipientEmail, sharingUrl, dateFrom, dateTo, accessDuration } =
    params

  const durationLabel = ACCESS_DURATION_LABELS[accessDuration] ?? accessDuration

  const body = [
    'Guten Tag',
    '',
    'Ich teile meine Symptom-Daten mit Ihnen über folgenden Link:',
    '',
    sharingUrl,
    '',
    `Zeitraum: ${formatDateDE(dateFrom)} \u2013 ${formatDateDE(dateTo)}`,
    `Der Link ist ${durationLabel} gültig.`,
    '',
    'Bitte beachten Sie: Der Zugang erlischt automatisch nach Ablauf der Zugriffsdauer. Die Daten sind nur zur Ansicht verfügbar (kein Download).',
    '',
    'Freundliche Grüsse',
  ].join('\n')

  const encodedSubject = encodeURIComponent(SUBJECT)
  const encodedBody = encodeURIComponent(body)

  const recipient = recipientEmail ?? ''
  return `mailto:${recipient}?subject=${encodedSubject}&body=${encodedBody}`
}
