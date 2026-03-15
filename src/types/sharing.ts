import { z } from 'zod'

export const RevokeSharingLinkSchema = z.object({
  linkId: z.string().uuid(),
})

export type SharingLinkStatus = 'active' | 'expired' | 'revoked'

export const DateRangeEnum = z.enum(['1m', '3m', '6m', '12m', 'custom'])
export const AccessDurationEnum = z.enum(['24h', '48h', '7d'])

export const emailSchema = z
  .string()
  .email('Bitte gültige E-Mail-Adresse eingeben')

export function isValidEmail(value: string): boolean {
  if (value === '') return true
  return emailSchema.safeParse(value).success
}

export const CreateSharingLinkSchema = z
  .object({
    dateRange: DateRangeEnum,
    accessDuration: AccessDurationEnum,
    customFrom: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    customTo: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    recipientEmail: z.string().email().optional().or(z.literal('')),
  })
  .refine(
    (data) => {
      if (data.dateRange === 'custom') {
        return !!data.customFrom && !!data.customTo
      }
      return true
    },
    {
      message: 'Von und Bis sind für individuellen Zeitraum erforderlich',
      path: ['customFrom'],
    },
  )
  .refine(
    (data) => {
      if (data.dateRange === 'custom' && data.customFrom && data.customTo) {
        return data.customFrom <= data.customTo
      }
      return true
    },
    {
      message: 'Von-Datum muss vor oder gleich Bis-Datum sein',
      path: ['customFrom'],
    },
  )
  .refine(
    (data) => {
      if (data.dateRange === 'custom' && data.customTo) {
        const today = new Date().toISOString().slice(0, 10)
        return data.customTo <= today
      }
      return true
    },
    {
      message: 'Bis-Datum darf nicht in der Zukunft liegen',
      path: ['customTo'],
    },
  )

export type DateRange = z.infer<typeof DateRangeEnum>
export type AccessDuration = z.infer<typeof AccessDurationEnum>
export type CreateSharingLinkInput = z.infer<typeof CreateSharingLinkSchema>

export type SharingLink = {
  id: string
  accountId: string
  token: string
  dateFrom: string
  dateTo: string
  expiresAt: string
  recipientEmail: string | null
  revokedAt: string | null
  createdAt: string
  shareUrl: string
  isActive: boolean
}

export type SharingLinkListItem = {
  id: string
  token: string
  dateFrom: string
  dateTo: string
  expiresAt: string
  createdAt: string
  shareUrl: string
  isActive: boolean
  recipientEmail?: string | null
  status: SharingLinkStatus
  revokedAt: string | null
}

// Story 5.3: Arzt-Zugriff — Zwei-Stufen-Token

/** Subset des sharing_links DB-Rows für Token-Validierung */
export type SharingLinkData = {
  id: string
  accountId: string
  dateFrom: string
  dateTo: string
  expiresAt: string
}

/** Kontext für das Arzt-Dashboard, aus dem validierten Session-Cookie */
export type SharingContext = {
  accountId: string
  dateFrom: string
  dateTo: string
  expiresAt: string
  linkId: string
}

/** Payload des HttpOnly-Cookies: linkId:expiresAtUnix:hmacSignature */
export type SharingSessionPayload = {
  linkId: string
  expiresAt: number // Unix timestamp (Sekunden)
  signature: string
}

/** Symptom-Event für das Arzt-Dashboard (readonly, gefiltert nach Zeitraum) */
export type SharedSymptomEvent = {
  id: string
  eventType: string
  occurredAt: string
  endedAt: string | null
  rawInput: string | null
  audioUrl: string | null
  status: string
}
