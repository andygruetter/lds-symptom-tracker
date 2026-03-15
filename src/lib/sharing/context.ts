import { cache } from 'react'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { validateSharingLinkById } from '@/lib/db/sharing'
import { parseSharingSession } from '@/lib/sharing/session'
import type { SharingLinkData } from '@/types/sharing'

/**
 * Validierter Sharing-Kontext aus dem Session-Cookie.
 * Cached per Request via React.cache() — Layout und Page teilen sich den DB-Call.
 *
 * Validierungskette:
 * 1. Cookie-Existenz
 * 2. HMAC-Signatur-Prüfung (ohne DB)
 * 3. DB-Check: Link noch gültig (nicht abgelaufen, nicht widerrufen)
 */
export const getSharingContext = cache(async (): Promise<SharingLinkData> => {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('sharing_session')

  if (!sessionCookie?.value) {
    redirect('/share/expired')
  }

  const session = parseSharingSession(sessionCookie.value)
  if (!session) {
    redirect('/share/expired')
  }

  const linkData = await validateSharingLinkById(session.linkId)
  if (!linkData) {
    redirect('/share/expired')
  }

  return linkData
})
