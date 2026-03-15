import { createHmac, timingSafeEqual } from 'crypto'

import type { SharingSessionPayload } from '@/types/sharing'

/**
 * Berechnet die HMAC-Signatur für den Cookie-Payload.
 * Input: linkId + expiresAtUnix (concatenated — UUID hat festes 36-Zeichen-Format, keine Ambiguität)
 */
function computeSignature(linkId: string, expiresAt: number): string {
  const secret = process.env.SHARING_HMAC_SECRET
  if (!secret) throw new Error('SHARING_HMAC_SECRET ist nicht konfiguriert')
  return createHmac('sha256', secret)
    .update(`${linkId}${expiresAt}`)
    .digest('hex')
}

/**
 * Erstellt den signierten Cookie-Wert für die Sharing-Session.
 * Format: {linkId}:{expiresAtUnix}:{hmacSignature}
 * Cookie-Attribute werden beim Setzen konfiguriert (HttpOnly, Secure, SameSite=Strict, Path=/share).
 */
export function createSharingSessionCookie(
  linkId: string,
  expiresAt: string,
): string {
  const expiresAtUnix = Math.floor(new Date(expiresAt).getTime() / 1000)
  const signature = computeSignature(linkId, expiresAtUnix)
  return `${linkId}:${expiresAtUnix}:${signature}`
}

/**
 * Parsed und validiert den Cookie-Wert.
 * Gibt null zurück wenn:
 * - Format ungültig (nicht 3 Teile)
 * - Signatur manipuliert
 * - SHARING_HMAC_SECRET fehlt
 */
export function parseSharingSession(
  cookieValue: string,
): SharingSessionPayload | null {
  const parts = cookieValue.split(':')
  // Format: {uuid}:{expiresAtUnix}:{hmac64hex} → genau 3 Teile (UUID enthält keine Doppelpunkte)
  if (parts.length !== 3) return null

  const [linkId, expiresAtStr, signature] = parts
  const expiresAt = parseInt(expiresAtStr, 10)

  if (!linkId || isNaN(expiresAt) || !signature) return null

  let expectedSignature: string
  try {
    expectedSignature = computeSignature(linkId, expiresAt)
  } catch {
    return null
  }

  // Timing-safe Vergleich gegen Timing-Angriffe (Security Best Practice)
  const sigBuffer = Buffer.from(signature, 'hex')
  const expectedBuffer = Buffer.from(expectedSignature, 'hex')
  if (
    sigBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(sigBuffer, expectedBuffer)
  )
    return null

  return { linkId, expiresAt, signature }
}
