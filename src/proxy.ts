import { type NextRequest, NextResponse } from 'next/server'

import { validateSharingLinkById } from '@/lib/db/sharing'
import { parseSharingSession } from '@/lib/sharing/session'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  const { user, supabaseResponse } = await updateSession(request)

  // TODO: DEV-ONLY BYPASS — vor Deployment entfernen!
  // Session-Cookies werden trotzdem verwaltet (updateSession oben),
  // aber Auth-Redirects werden übersprungen.
  if (process.env.BYPASS_AUTH === 'true') {
    return supabaseResponse
  }

  const path = request.nextUrl.pathname

  // Authentifizierte User von Login-Seite wegleiten
  if (path.startsWith('/auth/login') && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // Arzt-Dashboard: Sharing-Cookie prüfen (vor dem generischen /share Durchlass)
  if (path.startsWith('/share/dashboard')) {
    const sharingSession = request.cookies.get('sharing_session')
    if (!sharingSession?.value) {
      const url = request.nextUrl.clone()
      url.pathname = '/share/expired'
      return NextResponse.redirect(url)
    }

    // Story 5.4: Ablauf + Widerruf prüfen via DB-Lookup
    const session = parseSharingSession(sharingSession.value)
    if (!session) {
      const url = request.nextUrl.clone()
      url.pathname = '/share/expired'
      const response = NextResponse.redirect(url)
      response.cookies.delete('sharing_session')
      return response
    }

    const linkData = await validateSharingLinkById(session.linkId)
    if (!linkData) {
      const url = request.nextUrl.clone()
      url.pathname = '/share/expired'
      const response = NextResponse.redirect(url)
      response.cookies.delete('sharing_session')
      return response
    }

    return supabaseResponse
  }

  // Öffentliche Routen durchlassen: /auth/*, /api/*, /share/*, /marketing, /~offline
  if (
    path.startsWith('/auth') ||
    path.startsWith('/api') ||
    path.startsWith('/share') ||
    path.startsWith('/marketing') ||
    path.startsWith('/~offline')
  ) {
    return supabaseResponse
  }

  // Geschützte Routen: Redirect zu Marketing/Login wenn kein User
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = path === '/' ? '/marketing' : '/auth/login'
    return NextResponse.redirect(url)
  }

  // Disclaimer-Check: Redirect wenn noch nicht akzeptiert
  if (
    !path.startsWith('/disclaimer') &&
    user.user_metadata?.disclaimer_accepted !== true
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/disclaimer'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
