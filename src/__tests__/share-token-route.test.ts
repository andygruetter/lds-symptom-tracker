import { NextRequest } from 'next/server'

import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockValidateSharingToken = vi.fn()
const mockCreateSharingSessionCookie = vi.fn()

vi.mock('@/lib/db/sharing', () => ({
  validateSharingToken: (...args: unknown[]) =>
    mockValidateSharingToken(...args),
}))

vi.mock('@/lib/sharing/session', () => ({
  createSharingSessionCookie: (...args: unknown[]) =>
    mockCreateSharingSessionCookie(...args),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

function createRequest(token: string): NextRequest {
  return new NextRequest(`http://localhost:3000/share/${token}`)
}

describe('GET /share/[token]', () => {
  it('leitet auf /share/expired bei ungültigem Token-Format (zu kurz)', async () => {
    const { GET } = await import('@/app/share/[token]/route')
    const response = await GET(createRequest('abc123'), {
      params: Promise.resolve({ token: 'abc123' }),
    })

    expect(response.status).toBe(307)
    expect(new URL(response.headers.get('location')!).pathname).toBe(
      '/share/expired',
    )
    expect(mockValidateSharingToken).not.toHaveBeenCalled()
  })

  it('leitet auf /share/expired bei ungültigem Token-Format (Grossbuchstaben)', async () => {
    const token = 'A'.repeat(64)
    const { GET } = await import('@/app/share/[token]/route')
    const response = await GET(createRequest(token), {
      params: Promise.resolve({ token }),
    })

    expect(response.status).toBe(307)
    expect(new URL(response.headers.get('location')!).pathname).toBe(
      '/share/expired',
    )
    expect(mockValidateSharingToken).not.toHaveBeenCalled()
  })

  it('leitet auf /share/expired wenn validateSharingToken null zurückgibt', async () => {
    const token = 'a'.repeat(64)
    mockValidateSharingToken.mockResolvedValue(null)

    const { GET } = await import('@/app/share/[token]/route')
    const response = await GET(createRequest(token), {
      params: Promise.resolve({ token }),
    })

    expect(response.status).toBe(307)
    expect(new URL(response.headers.get('location')!).pathname).toBe(
      '/share/expired',
    )
    expect(mockValidateSharingToken).toHaveBeenCalledWith(token)
  })

  it('setzt Cookie und leitet auf /share/dashboard bei gültigem Token', async () => {
    const token = 'a'.repeat(64)
    const expiresAt = '2026-03-16T12:00:00.000Z'
    mockValidateSharingToken.mockResolvedValue({
      id: 'link-uuid-1',
      accountId: 'user-1',
      dateFrom: '2026-02-15',
      dateTo: '2026-03-15',
      expiresAt,
    })
    mockCreateSharingSessionCookie.mockReturnValue('signed-cookie-value')

    const { GET } = await import('@/app/share/[token]/route')
    const response = await GET(createRequest(token), {
      params: Promise.resolve({ token }),
    })

    expect(response.status).toBe(307)
    expect(new URL(response.headers.get('location')!).pathname).toBe(
      '/share/dashboard',
    )

    // Cookie muss gesetzt sein
    const setCookie = response.headers.get('set-cookie')
    expect(setCookie).toContain('sharing_session=signed-cookie-value')
    expect(setCookie).toContain('HttpOnly')
    expect(setCookie?.toLowerCase()).toContain('samesite=strict')
    expect(setCookie).toContain('Path=/share')

    expect(mockCreateSharingSessionCookie).toHaveBeenCalledWith(
      'link-uuid-1',
      expiresAt,
    )
  })

  it('berechnet maxAge korrekt aus expiresAt', async () => {
    const token = 'b'.repeat(64)
    // expiresAt 1 Stunde in der Zukunft
    const futureDate = new Date(Date.now() + 3600 * 1000)
    mockValidateSharingToken.mockResolvedValue({
      id: 'link-uuid-2',
      accountId: 'user-2',
      dateFrom: '2026-01-01',
      dateTo: '2026-03-01',
      expiresAt: futureDate.toISOString(),
    })
    mockCreateSharingSessionCookie.mockReturnValue('cookie-val')

    const { GET } = await import('@/app/share/[token]/route')
    const response = await GET(createRequest(token), {
      params: Promise.resolve({ token }),
    })

    const setCookie = response.headers.get('set-cookie')!
    // Max-Age sollte ca. 3600 sein (±2 Sekunden Toleranz)
    const maxAgeMatch = setCookie.match(/Max-Age=(\d+)/)
    expect(maxAgeMatch).not.toBeNull()
    const maxAge = parseInt(maxAgeMatch![1], 10)
    expect(maxAge).toBeGreaterThanOrEqual(3598)
    expect(maxAge).toBeLessThanOrEqual(3600)
  })
})
