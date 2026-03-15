import { createHash, createHmac, randomUUID } from 'crypto'

/**
 * Generiert einen kryptographisch sicheren Sharing-Token.
 * Format: UUID + HMAC-SHA256 → 64-Zeichen Hex-String.
 * Nicht erratbar, nicht aufzählbar (NFR9).
 */
export function generateSharingToken(): string {
  const secret = process.env.SHARING_HMAC_SECRET
  if (!secret) {
    throw new Error('SHARING_HMAC_SECRET ist nicht konfiguriert')
  }
  return createHmac('sha256', secret).update(randomUUID()).digest('hex')
}

/**
 * Erstellt einen HMAC-SHA-256-Hash einer IP-Adresse (Privacy-konform, nicht umkehrbar).
 * Nie Klartext-IPs speichern — nur den Hash (NFR11).
 * Verwendet HMAC mit SHARING_HMAC_SECRET um Rainbow-Table-Angriffe auf den
 * kleinen IPv4-Adressraum (~4.3 Mrd.) zu verhindern.
 */
export function hashIpAddress(ip: string): string {
  const secret = process.env.SHARING_HMAC_SECRET
  if (secret) {
    return createHmac('sha256', secret).update(ip).digest('hex')
  }
  return createHash('sha256').update(ip).digest('hex')
}
