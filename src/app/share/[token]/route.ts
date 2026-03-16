import { NextRequest, NextResponse } from 'next/server'

import { validateSharingToken } from '@/lib/db/sharing'
import { createSharingSessionCookie } from '@/lib/sharing/session'

/**
 * Token-Validierungs-Route: GET /share/[token]
 *
 * Stufe 2 des Zwei-Stufen-Token-Systems (Architektur D3):
 * 1. Token aus URL gegen sharing_links validieren
 * 2. Bei gültigem Token: HttpOnly Cookie setzen + auf /share/dashboard weiterleiten
 * 3. Bei ungültigem Token: auf /share/expired weiterleiten
 *
 * Route Handler statt Page, weil cookies().set() in Next.js 16 nur in
 * Route Handlers und Server Actions erlaubt ist.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params

  // Token-Format validieren bevor DB-Query (64-Zeichen Hex, Story 5.1 Format)
  if (!/^[a-f0-9]{64}$/.test(token)) {
    return NextResponse.redirect(new URL('/share/expired', request.url))
  }

  const linkData = await validateSharingToken(token)

  if (!linkData) {
    return NextResponse.redirect(new URL('/share/expired', request.url))
  }

  const cookieValue = createSharingSessionCookie(
    linkData.id,
    linkData.expiresAt,
  )
  const maxAge = Math.max(
    0,
    Math.floor((new Date(linkData.expiresAt).getTime() - Date.now()) / 1000),
  )

  const response = NextResponse.redirect(
    new URL('/share/dashboard', request.url),
  )
  response.cookies.set('sharing_session', cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge,
  })

  return response
}
