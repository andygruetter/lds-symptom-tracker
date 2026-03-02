import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mocks MÜSSEN vor den Imports definiert werden
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(() => ({ from: vi.fn() })),
  createServerClient: vi.fn(() => ({ from: vi.fn() })),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ from: vi.fn() })),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      getAll: vi.fn(() => []),
      set: vi.fn(),
    }),
  ),
}))

// Env-Variablen setzen
const TEST_URL = 'https://test.supabase.co'
const TEST_ANON_KEY = 'test-anon-key'
const TEST_SERVICE_KEY = 'test-service-role-key'

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', TEST_URL)
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', TEST_ANON_KEY)
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', TEST_SERVICE_KEY)
  vi.clearAllMocks()
})

describe('createBrowserClient', () => {
  it('ruft @supabase/ssr createBrowserClient mit korrekten Parametern auf', async () => {
    const { createBrowserClient: createBrowserMock } = await import(
      '@supabase/ssr'
    )
    const { createBrowserClient } = await import('@/lib/db/client')

    createBrowserClient()

    expect(createBrowserMock).toHaveBeenCalledWith(TEST_URL, TEST_ANON_KEY)
  })
})

describe('createServerClient', () => {
  it('ruft @supabase/ssr createServerClient mit getAll/setAll Cookie-API auf', async () => {
    const { createServerClient: createServerMock } = await import(
      '@supabase/ssr'
    )
    const { createServerClient } = await import('@/lib/db/client')

    await createServerClient()

    expect(createServerMock).toHaveBeenCalledWith(
      TEST_URL,
      TEST_ANON_KEY,
      expect.objectContaining({
        cookies: expect.objectContaining({
          getAll: expect.any(Function),
          setAll: expect.any(Function),
        }),
      }),
    )
  })

  it('nutzt async cookies() von next/headers', async () => {
    const { cookies } = await import('next/headers')
    const { createServerClient } = await import('@/lib/db/client')

    await createServerClient()

    expect(cookies).toHaveBeenCalled()
  })

  it('getAll delegiert an cookieStore.getAll', async () => {
    const { createServerClient: createServerMock } = await import(
      '@supabase/ssr'
    )
    const { createServerClient } = await import('@/lib/db/client')

    await createServerClient()

    const cookiesConfig = (createServerMock as ReturnType<typeof vi.fn>).mock
      .calls[0][2].cookies
    const result = cookiesConfig.getAll()
    expect(result).toEqual([])
  })

  it('setAll ruft cookieStore.set für jedes Cookie auf', async () => {
    const { cookies } = await import('next/headers')
    const mockSet = vi.fn()
    ;(cookies as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      getAll: vi.fn(() => []),
      set: mockSet,
    })

    const { createServerClient: createServerMock } = await import(
      '@supabase/ssr'
    )
    const { createServerClient } = await import('@/lib/db/client')

    await createServerClient()

    const cookiesConfig = (createServerMock as ReturnType<typeof vi.fn>).mock
      .calls[0][2].cookies
    cookiesConfig.setAll([
      { name: 'token', value: 'abc', options: { path: '/' } },
      { name: 'refresh', value: 'xyz', options: { path: '/' } },
    ])

    expect(mockSet).toHaveBeenCalledTimes(2)
    expect(mockSet).toHaveBeenCalledWith('token', 'abc', { path: '/' })
    expect(mockSet).toHaveBeenCalledWith('refresh', 'xyz', { path: '/' })
  })

  it('setAll schluckt Fehler aus Server Components', async () => {
    const { cookies } = await import('next/headers')
    ;(cookies as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      getAll: vi.fn(() => []),
      set: vi.fn(() => {
        throw new Error('Cannot set cookies in Server Component')
      }),
    })

    const { createServerClient: createServerMock } = await import(
      '@supabase/ssr'
    )
    const { createServerClient } = await import('@/lib/db/client')

    await createServerClient()

    const cookiesConfig = (createServerMock as ReturnType<typeof vi.fn>).mock
      .calls[0][2].cookies

    expect(() =>
      cookiesConfig.setAll([
        { name: 'token', value: 'abc', options: {} },
      ]),
    ).not.toThrow()
  })
})

describe('createServiceClient', () => {
  it('ruft @supabase/supabase-js createClient mit Service Role Key auf', async () => {
    const { createClient: createClientMock } = await import(
      '@supabase/supabase-js'
    )
    const { createServiceClient } = await import('@/lib/db/client')

    createServiceClient()

    expect(createClientMock).toHaveBeenCalledWith(
      TEST_URL,
      TEST_SERVICE_KEY,
      expect.objectContaining({
        auth: expect.objectContaining({
          autoRefreshToken: false,
          persistSession: false,
        }),
      }),
    )
  })
})
