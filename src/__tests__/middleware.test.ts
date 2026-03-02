import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock updateSession
const mockUpdateSession = vi.fn()
vi.mock('@/lib/supabase/middleware', () => ({
  updateSession: (...args: unknown[]) => mockUpdateSession(...args),
}))

// Mock next/server
const mockRedirect = vi.fn(
  (url: string | URL) =>
    new Response(null, {
      status: 307,
      headers: { Location: url.toString() },
    }),
)

vi.mock('next/server', () => {
  const NextResponse = {
    next: vi.fn(() => new Response()),
    redirect: (...args: unknown[]) => mockRedirect(...args),
  }
  return { NextResponse }
})

function createMockRequest(pathname: string) {
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
      getAll: () => [],
      set: vi.fn(),
    },
    headers: new Headers(),
    url: url.toString(),
  } as unknown
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('middleware', () => {
  it('leitet unauthentifizierte Nutzer zu /auth/login um', async () => {
    const mockResponse = new Response()
    mockUpdateSession.mockResolvedValue({
      user: null,
      supabaseResponse: mockResponse,
    })

    const { middleware } = await import('@/middleware')
    const request = createMockRequest('/')

    const result = await middleware(request as Parameters<typeof middleware>[0])

    expect(result?.status).toBe(307)
    expect(result?.headers.get('Location')).toContain('/auth/login')
  })

  it('lässt authentifizierte Nutzer durch', async () => {
    const mockResponse = new Response()
    mockUpdateSession.mockResolvedValue({
      user: { id: 'test-user-id' },
      supabaseResponse: mockResponse,
    })

    const { middleware } = await import('@/middleware')
    const request = createMockRequest('/')

    const result = await middleware(request as Parameters<typeof middleware>[0])

    expect(result).toBe(mockResponse)
  })

  it('leitet authentifizierte Nutzer von /auth/login zu / um', async () => {
    const mockResponse = new Response()
    mockUpdateSession.mockResolvedValue({
      user: { id: 'test-user-id' },
      supabaseResponse: mockResponse,
    })

    const { middleware } = await import('@/middleware')
    const request = createMockRequest('/auth/login')

    const result = await middleware(request as Parameters<typeof middleware>[0])

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

    const { middleware } = await import('@/middleware')
    const request = createMockRequest('/auth/login')

    const result = await middleware(request as Parameters<typeof middleware>[0])

    expect(result).toBe(mockResponse)
  })

  it('lässt /api/* Routen ohne Auth-Check durch', async () => {
    const mockResponse = new Response()
    mockUpdateSession.mockResolvedValue({
      user: null,
      supabaseResponse: mockResponse,
    })

    const { middleware } = await import('@/middleware')
    const request = createMockRequest('/api/health')

    const result = await middleware(request as Parameters<typeof middleware>[0])

    expect(result).toBe(mockResponse)
  })

  it('lässt /share/* Routen ohne Auth-Check durch', async () => {
    const mockResponse = new Response()
    mockUpdateSession.mockResolvedValue({
      user: null,
      supabaseResponse: mockResponse,
    })

    const { middleware } = await import('@/middleware')
    const request = createMockRequest('/share/abc123')

    const result = await middleware(request as Parameters<typeof middleware>[0])

    expect(result).toBe(mockResponse)
  })

  it('lässt /~offline Route ohne Auth-Check durch', async () => {
    const mockResponse = new Response()
    mockUpdateSession.mockResolvedValue({
      user: null,
      supabaseResponse: mockResponse,
    })

    const { middleware } = await import('@/middleware')
    const request = createMockRequest('/~offline')

    const result = await middleware(request as Parameters<typeof middleware>[0])

    expect(result).toBe(mockResponse)
  })
})
