import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock updateSession
const mockUpdateSession = vi.fn()
vi.mock('@/lib/supabase/middleware', () => ({
  updateSession: (...args: unknown[]) => mockUpdateSession(...args),
}))

// Mock parseSharingSession
const mockParseSharingSession = vi.fn()
vi.mock('@/lib/sharing/session', () => ({
  parseSharingSession: (...args: unknown[]) => mockParseSharingSession(...args),
}))

// Mock validateSharingLinkById
const mockValidateSharingLinkById = vi.fn()
vi.mock('@/lib/db/sharing', () => ({
  validateSharingLinkById: (...args: unknown[]) =>
    mockValidateSharingLinkById(...args),
}))

// Mock next/server
const mockRedirect = vi.fn((url: string | URL) => {
  const resp = new Response(null, {
    status: 307,
    headers: { Location: url.toString() },
  }) as Response & { cookies: { delete: ReturnType<typeof vi.fn> } }
  resp.cookies = { delete: vi.fn() }
  return resp
})

vi.mock('next/server', () => {
  const NextResponse = {
    next: vi.fn(() => new Response()),
    redirect: (...args: unknown[]) => mockRedirect(...args),
  }
  return { NextResponse }
})

function createMockRequest(
  pathname: string,
  cookies: Record<string, string> = {},
) {
  const url = new URL(pathname, 'http://localhost:3000')
  return {
    nextUrl: {
      pathname,
      clone: () => {
        const cloned = new URL(url)
        return Object.defineProperty(
          { toString: () => cloned.toString() },
          'pathname',
          {
            get: () => cloned.pathname,
            set: (p: string) => {
              cloned.pathname = p
            },
          },
        )
      },
    },
    cookies: {
      getAll: () =>
        Object.entries(cookies).map(([name, value]) => ({ name, value })),
      get: (name: string) =>
        name in cookies ? { value: cookies[name] } : undefined,
      set: vi.fn(),
    },
    headers: new Headers(),
    url: url.toString(),
  } as unknown
}

beforeEach(() => {
  vi.clearAllMocks()
  // Default: Cookie ist gültig formatiert und Link ist aktiv
  mockParseSharingSession.mockReturnValue({
    linkId: 'link-uuid-1',
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
    signature: 'valid-sig',
  })
  mockValidateSharingLinkById.mockResolvedValue({
    id: 'link-uuid-1',
    accountId: 'user-1',
    dateFrom: '2026-01-01',
    dateTo: '2026-03-15',
    expiresAt: '2099-01-01T00:00:00.000Z',
  })
})

describe('proxy', () => {
  it('leitet unauthentifizierte Nutzer zu /auth/login um', async () => {
    const mockResponse = new Response()
    mockUpdateSession.mockResolvedValue({
      user: null,
      supabaseResponse: mockResponse,
    })

    const { proxy } = await import('@/proxy')
    const request = createMockRequest('/')

    const result = await proxy(request as Parameters<typeof proxy>[0])

    expect(result?.status).toBe(307)
    expect(result?.headers.get('Location')).toContain('/auth/login')
  })

  it('lässt authentifizierte Nutzer mit akzeptiertem Disclaimer durch', async () => {
    const mockResponse = new Response()
    mockUpdateSession.mockResolvedValue({
      user: {
        id: 'test-user-id',
        user_metadata: { disclaimer_accepted: true },
      },
      supabaseResponse: mockResponse,
    })

    const { proxy } = await import('@/proxy')
    const request = createMockRequest('/')

    const result = await proxy(request as Parameters<typeof proxy>[0])

    expect(result).toBe(mockResponse)
  })

  it('leitet authentifizierte Nutzer ohne Disclaimer zu /disclaimer um', async () => {
    const mockResponse = new Response()
    mockUpdateSession.mockResolvedValue({
      user: { id: 'test-user-id', user_metadata: {} },
      supabaseResponse: mockResponse,
    })

    const { proxy } = await import('@/proxy')
    const request = createMockRequest('/')

    const result = await proxy(request as Parameters<typeof proxy>[0])

    expect(result?.status).toBe(307)
    expect(result?.headers.get('Location')).toContain('/disclaimer')
  })

  it('lässt /disclaimer Route für authentifizierte User ohne Disclaimer durch', async () => {
    const mockResponse = new Response()
    mockUpdateSession.mockResolvedValue({
      user: { id: 'test-user-id', user_metadata: {} },
      supabaseResponse: mockResponse,
    })

    const { proxy } = await import('@/proxy')
    const request = createMockRequest('/disclaimer')

    const result = await proxy(request as Parameters<typeof proxy>[0])

    expect(result).toBe(mockResponse)
  })

  it('leitet authentifizierte Nutzer von /auth/login zu / um', async () => {
    const mockResponse = new Response()
    mockUpdateSession.mockResolvedValue({
      user: {
        id: 'test-user-id',
        user_metadata: { disclaimer_accepted: true },
      },
      supabaseResponse: mockResponse,
    })

    const { proxy } = await import('@/proxy')
    const request = createMockRequest('/auth/login')

    const result = await proxy(request as Parameters<typeof proxy>[0])

    expect(result?.status).toBe(307)
    expect(result?.headers.get('Location')).toContain('/')
    expect(result?.headers.get('Location')).not.toContain('/auth/login')
  })

  it('lässt /auth/* Routen ohne Auth-Check durch', async () => {
    const mockResponse = new Response()
    mockUpdateSession.mockResolvedValue({
      user: null,
      supabaseResponse: mockResponse,
    })

    const { proxy } = await import('@/proxy')
    const request = createMockRequest('/auth/login')

    const result = await proxy(request as Parameters<typeof proxy>[0])

    expect(result).toBe(mockResponse)
  })

  it('lässt /api/* Routen ohne Auth-Check durch', async () => {
    const mockResponse = new Response()
    mockUpdateSession.mockResolvedValue({
      user: null,
      supabaseResponse: mockResponse,
    })

    const { proxy } = await import('@/proxy')
    const request = createMockRequest('/api/health')

    const result = await proxy(request as Parameters<typeof proxy>[0])

    expect(result).toBe(mockResponse)
  })

  it('lässt /share/[token] Routen ohne Cookie durch', async () => {
    const mockResponse = new Response()
    mockUpdateSession.mockResolvedValue({
      user: null,
      supabaseResponse: mockResponse,
    })

    const { proxy } = await import('@/proxy')
    const request = createMockRequest('/share/abc123')

    const result = await proxy(request as Parameters<typeof proxy>[0])

    expect(result).toBe(mockResponse)
  })

  it('lässt /share/expired ohne Cookie durch', async () => {
    const mockResponse = new Response()
    mockUpdateSession.mockResolvedValue({
      user: null,
      supabaseResponse: mockResponse,
    })

    const { proxy } = await import('@/proxy')
    const request = createMockRequest('/share/expired')

    const result = await proxy(request as Parameters<typeof proxy>[0])

    expect(result).toBe(mockResponse)
  })

  it('leitet /share/dashboard ohne sharing_session Cookie zu /share/expired um', async () => {
    const mockResponse = new Response()
    mockUpdateSession.mockResolvedValue({
      user: null,
      supabaseResponse: mockResponse,
    })

    const { proxy } = await import('@/proxy')
    const request = createMockRequest('/share/dashboard')

    const result = await proxy(request as Parameters<typeof proxy>[0])

    expect(result?.status).toBe(307)
    expect(result?.headers.get('Location')).toContain('/share/expired')
  })

  it('leitet /share/dashboard/sub-route ohne Cookie zu /share/expired um', async () => {
    const mockResponse = new Response()
    mockUpdateSession.mockResolvedValue({
      user: null,
      supabaseResponse: mockResponse,
    })

    const { proxy } = await import('@/proxy')
    const request = createMockRequest('/share/dashboard/details')

    const result = await proxy(request as Parameters<typeof proxy>[0])

    expect(result?.status).toBe(307)
    expect(result?.headers.get('Location')).toContain('/share/expired')
  })

  it('lässt /share/dashboard mit gültigem Cookie und aktivem Link durch', async () => {
    const mockResponse = new Response()
    mockUpdateSession.mockResolvedValue({
      user: null,
      supabaseResponse: mockResponse,
    })

    const { proxy } = await import('@/proxy')
    const request = createMockRequest('/share/dashboard', {
      sharing_session: 'link-uuid-1:9999999999:valid-sig',
    })

    const result = await proxy(request as Parameters<typeof proxy>[0])

    expect(result).toBe(mockResponse)
  })

  it('leitet /share/dashboard zu /share/expired wenn Cookie-Signatur ungültig', async () => {
    mockParseSharingSession.mockReturnValue(null)
    const mockResponse = new Response()
    mockUpdateSession.mockResolvedValue({
      user: null,
      supabaseResponse: mockResponse,
    })

    const { proxy } = await import('@/proxy')
    const request = createMockRequest('/share/dashboard', {
      sharing_session: 'tampered-cookie',
    })

    const result = await proxy(request as Parameters<typeof proxy>[0])

    expect(result?.status).toBe(307)
    expect(result?.headers.get('Location')).toContain('/share/expired')
    expect(
      (result as unknown as { cookies: { delete: ReturnType<typeof vi.fn> } })
        .cookies.delete,
    ).toHaveBeenCalledWith('sharing_session')
  })

  it('leitet /share/dashboard zu /share/expired wenn Link abgelaufen', async () => {
    mockValidateSharingLinkById.mockResolvedValue(null)
    const mockResponse = new Response()
    mockUpdateSession.mockResolvedValue({
      user: null,
      supabaseResponse: mockResponse,
    })

    const { proxy } = await import('@/proxy')
    const request = createMockRequest('/share/dashboard', {
      sharing_session: 'link-uuid-1:9999999999:valid-sig',
    })

    const result = await proxy(request as Parameters<typeof proxy>[0])

    expect(result?.status).toBe(307)
    expect(result?.headers.get('Location')).toContain('/share/expired')
    expect(
      (result as unknown as { cookies: { delete: ReturnType<typeof vi.fn> } })
        .cookies.delete,
    ).toHaveBeenCalledWith('sharing_session')
  })

  it('leitet /share/dashboard zu /share/expired wenn Link widerrufen', async () => {
    mockValidateSharingLinkById.mockResolvedValue(null)
    const mockResponse = new Response()
    mockUpdateSession.mockResolvedValue({
      user: null,
      supabaseResponse: mockResponse,
    })

    const { proxy } = await import('@/proxy')
    const request = createMockRequest('/share/dashboard', {
      sharing_session: 'link-uuid-1:9999999999:valid-sig',
    })

    const result = await proxy(request as Parameters<typeof proxy>[0])

    expect(result?.status).toBe(307)
    expect(result?.headers.get('Location')).toContain('/share/expired')
    expect(
      (result as unknown as { cookies: { delete: ReturnType<typeof vi.fn> } })
        .cookies.delete,
    ).toHaveBeenCalledWith('sharing_session')
  })

  it('lässt /~offline Route ohne Auth-Check durch', async () => {
    const mockResponse = new Response()
    mockUpdateSession.mockResolvedValue({
      user: null,
      supabaseResponse: mockResponse,
    })

    const { proxy } = await import('@/proxy')
    const request = createMockRequest('/~offline')

    const result = await proxy(request as Parameters<typeof proxy>[0])

    expect(result).toBe(mockResponse)
  })
})
