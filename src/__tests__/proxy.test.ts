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

  it('lässt /share/* Routen ohne Auth-Check durch', async () => {
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
