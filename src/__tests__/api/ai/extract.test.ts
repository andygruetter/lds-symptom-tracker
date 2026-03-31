import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock pipeline
const mockRunExtractionPipeline = vi.fn()
vi.mock('@/lib/ai/pipeline', () => ({
  runExtractionPipeline: (...args: unknown[]) =>
    mockRunExtractionPipeline(...args),
}))

// Mock prepareRerun
const mockPrepareRerun = vi.fn()
vi.mock('@/lib/ai/rerun', () => ({
  prepareRerun: (...args: unknown[]) => mockPrepareRerun(...args),
}))

// Mock clients
const mockGetUser = vi.fn()
const mockFromServerClient = vi.fn()
const mockCreateServerClient = vi.fn()

vi.mock('@/lib/db/client', () => ({
  createServiceClient: vi.fn(() => ({ from: vi.fn() })),
  createServerClient: (...args: unknown[]) => mockCreateServerClient(...args),
}))

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000'

beforeEach(() => {
  vi.clearAllMocks()
  vi.unstubAllEnvs()
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key')

  mockPrepareRerun.mockResolvedValue(undefined)
  mockRunExtractionPipeline.mockResolvedValue(undefined)

  // Default: unauthenticated server client
  mockGetUser.mockResolvedValue({ data: { user: null } })
  mockFromServerClient.mockReturnValue({
    select: () => ({
      eq: () => ({ single: vi.fn().mockResolvedValue({ data: null }) }),
    }),
  })
  mockCreateServerClient.mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: mockFromServerClient,
  })
})

describe('POST /api/ai/extract', () => {
  it('gibt 400 zurück bei ungültigem Body', async () => {
    const { POST } = await import('@/app/api/ai/extract/route')

    const request = new Request('http://localhost/api/ai/extract', {
      method: 'POST',
      body: 'invalid json',
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('gibt 400 zurück bei fehlender Event-ID', async () => {
    const { POST } = await import('@/app/api/ai/extract/route')

    const request = new Request('http://localhost/api/ai/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('gibt 400 zurück bei ungültiger UUID', async () => {
    const { POST } = await import('@/app/api/ai/extract/route')

    const request = new Request('http://localhost/api/ai/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symptomEventId: 'not-a-uuid' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('gibt 200 zurück bei erfolgreicher Extraktion', async () => {
    const { POST } = await import('@/app/api/ai/extract/route')

    const request = new Request('http://localhost/api/ai/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symptomEventId: VALID_UUID }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.success).toBe(true)
  })

  it('gibt 401 zurück bei fehlendem Secret-Token (Session unauthenticated)', async () => {
    vi.stubEnv('INTERNAL_API_SECRET', 'test-secret')

    const { POST } = await import('@/app/api/ai/extract/route')

    const request = new Request('http://localhost/api/ai/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symptomEventId: VALID_UUID }),
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
  })

  it('gibt 500 zurück bei Pipeline-Fehler', async () => {
    mockRunExtractionPipeline.mockRejectedValue(new Error('Pipeline failed'))

    const { POST } = await import('@/app/api/ai/extract/route')

    const request = new Request('http://localhost/api/ai/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symptomEventId: VALID_UUID }),
    })

    const response = await POST(request)
    expect(response.status).toBe(500)
  })

  // --- Neue Tests: mode-Parameter ---

  it('akzeptiert mode=extract (Default)', async () => {
    const { POST } = await import('@/app/api/ai/extract/route')

    const request = new Request('http://localhost/api/ai/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symptomEventId: VALID_UUID, mode: 'extract' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    expect(mockPrepareRerun).toHaveBeenCalledWith(
      expect.anything(),
      VALID_UUID,
      'extract',
    )
  })

  it('akzeptiert mode=transcribe', async () => {
    const { POST } = await import('@/app/api/ai/extract/route')

    const request = new Request('http://localhost/api/ai/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symptomEventId: VALID_UUID, mode: 'transcribe' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    expect(mockPrepareRerun).toHaveBeenCalledWith(
      expect.anything(),
      VALID_UUID,
      'transcribe',
    )
  })

  it('gibt 400 zurück bei ungültigem mode-Wert', async () => {
    const { POST } = await import('@/app/api/ai/extract/route')

    const request = new Request('http://localhost/api/ai/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symptomEventId: VALID_UUID, mode: 'invalid' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('gibt 400 zurück wenn prepareRerun fehlschlägt', async () => {
    mockPrepareRerun.mockRejectedValue(
      new Error('Event bereits in Verarbeitung'),
    )

    const { POST } = await import('@/app/api/ai/extract/route')

    const request = new Request('http://localhost/api/ai/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symptomEventId: VALID_UUID }),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  // --- Neue Tests: Session-Auth ---

  it('authentifiziert per Session wenn kein INTERNAL_API_SECRET Header gesetzt', async () => {
    vi.stubEnv('INTERNAL_API_SECRET', 'test-secret')

    // Authentifizierter User mit Ownership
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockFromServerClient.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: vi.fn().mockResolvedValue({ data: { account_id: 'user-1' } }),
        }),
      }),
    })

    const { POST } = await import('@/app/api/ai/extract/route')

    const request = new Request('http://localhost/api/ai/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symptomEventId: VALID_UUID }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
  })

  it('gibt 401 zurück bei unauthentifizierter Session-Anfrage', async () => {
    vi.stubEnv('INTERNAL_API_SECRET', 'test-secret')
    // mockGetUser returns null user (default)

    const { POST } = await import('@/app/api/ai/extract/route')

    const request = new Request('http://localhost/api/ai/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symptomEventId: VALID_UUID }),
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
  })

  it('gibt 403 zurück bei fremdem Event (Ownership-Check)', async () => {
    vi.stubEnv('INTERNAL_API_SECRET', 'test-secret')

    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    // Event gehört user-2
    mockFromServerClient.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: vi.fn().mockResolvedValue({
            data: { account_id: 'user-2' },
          }),
        }),
      }),
    })

    const { POST } = await import('@/app/api/ai/extract/route')

    const request = new Request('http://localhost/api/ai/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symptomEventId: VALID_UUID }),
    })

    const response = await POST(request)
    expect(response.status).toBe(403)
  })
})
