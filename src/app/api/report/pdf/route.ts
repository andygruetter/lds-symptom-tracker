import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'

import { createServerClient, createServiceClient } from '@/lib/db/client'
import { trackSharingAccess } from '@/lib/db/audit'
import { validateSharingLinkById } from '@/lib/db/sharing'
import { parseSharingSession } from '@/lib/sharing/session'
import { aggregatePdfData } from '@/lib/pdf/pdf-data'
import { SymptomReportDocument } from '@/lib/pdf/symptom-report'
import type { SharingLinkData } from '@/types/sharing'
import type { PdfReportData } from '@/types/report'

type AuthResult = {
  accountId: string
  dateFrom: string
  dateTo: string
  authType: 'patient' | 'doctor'
  sharingLink: SharingLinkData | null
}

async function resolveAuth(request: NextRequest): Promise<AuthResult> {
  // 1. Versuche Patient-Auth (Supabase Session)
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const startDate = request.nextUrl.searchParams.get('startDate')
    const endDate = request.nextUrl.searchParams.get('endDate')

    if (!startDate || !endDate) {
      throw Object.assign(new Error('INVALID_DATE_RANGE'), {
        status: 400,
        code: 'INVALID_DATE_RANGE',
      })
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      throw Object.assign(new Error('INVALID_DATE_RANGE'), {
        status: 400,
        code: 'INVALID_DATE_RANGE',
      })
    }

    return {
      accountId: user.id,
      dateFrom: startDate,
      dateTo: endDate,
      authType: 'patient',
      sharingLink: null,
    }
  }

  // 2. Fallback: Arzt-Auth (Sharing-Cookie)
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('sharing_session')

  if (sessionCookie?.value) {
    const session = parseSharingSession(sessionCookie.value)
    if (session) {
      const link = await validateSharingLinkById(session.linkId)
      if (link) {
        return {
          accountId: link.accountId,
          dateFrom: link.dateFrom,
          dateTo: link.dateTo,
          authType: 'doctor',
          sharingLink: link,
        }
      }
    }
  }

  throw Object.assign(new Error('AUTH_REQUIRED'), {
    status: 401,
    code: 'AUTH_REQUIRED',
  })
}

export async function GET(request: NextRequest) {
  let auth: AuthResult

  try {
    auth = await resolveAuth(request)
  } catch (err) {
    const error = err as Error & { status?: number; code?: string }
    const code = error.code ?? 'AUTH_REQUIRED'

    if (code === 'INVALID_DATE_RANGE') {
      return NextResponse.json(
        { error: { error: 'Ungültiger Datumsbereich', code } },
        { status: 400 },
      )
    }
    return NextResponse.json(
      { error: { error: 'Authentifizierung erforderlich', code } },
      { status: 401 },
    )
  }

  const { accountId, dateFrom, dateTo, sharingLink } = auth

  try {
    const supabase = createServiceClient()
    const data: PdfReportData = await aggregatePdfData(
      supabase,
      accountId,
      dateFrom,
      dateTo,
    )

    // Render PDF — cast nötig da @react-pdf/renderer interne DocumentProps erwartet
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const element = React.createElement(SymptomReportDocument, { data }) as any
    const buffer = await renderToBuffer(element)

    // Audit-Log (best-effort, blockiert nicht)
    if (sharingLink) {
      void trackSharingAccess(request, sharingLink, 'pdf_download', {
        dateFrom,
        dateTo,
        eventCount: data.metadata.totalEvents,
      })
    }

    const filename = `symptom-report-${dateFrom}-${dateTo}.pdf`
    const uint8 = new Uint8Array(buffer)

    return new Response(uint8, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': uint8.byteLength.toString(),
      },
    })
  } catch (err) {
    console.error('[PDF] Generierung fehlgeschlagen:', err)
    return NextResponse.json(
      {
        error: {
          error: 'PDF-Generierung fehlgeschlagen',
          code: 'PDF_GENERATION_FAILED',
        },
      },
      { status: 500 },
    )
  }
}
