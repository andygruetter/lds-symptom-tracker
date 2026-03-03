import { type NextRequest, NextResponse } from 'next/server'

import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
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

  // Öffentliche Routen durchlassen: /auth/*, /api/*, /share/*, /~offline
  if (
    path.startsWith('/auth') ||
    path.startsWith('/api') ||
    path.startsWith('/share') ||
    path.startsWith('/~offline')
  ) {
    return supabaseResponse
  }

  // Geschützte Routen: Redirect zu Login wenn kein User
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
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
