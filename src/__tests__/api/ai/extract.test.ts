import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock pipeline
const mockRunExtractionPipeline = vi.fn()
vi.mock('@/lib/ai/pipeline', () => ({
  runExtractionPipeline: (...args: unknown[]) =>
    mockRunExtractionPipeline(...args),
}))

// Mock service client
vi.mock('@/lib/db/client', () => ({
  createServiceClient: vi.fn(() => ({
    from: vi.fn(),
  })),
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.unstubAllEnvs()
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key')
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
    mockRunExtractionPipeline.mockResolvedValue(undefined)

    const { POST } = await import('@/app/api/ai/extract/route')

    const request = new Request('http://localhost/api/ai/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symptomEventId: '550e8400-e29b-41d4-a716-446655440000',
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.success).toBe(true)
  })

  it('gibt 401 zurück bei fehlendem Secret-Token', async () => {
    vi.stubEnv('INTERNAL_API_SECRET', 'test-secret')

    const { POST } = await import('@/app/api/ai/extract/route')

    const request = new Request('http://localhost/api/ai/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symptomEventId: '550e8400-e29b-41d4-a716-446655440000',
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
  })

  it('gibt 500 zurück bei Pipeline-Fehler', async () => {
    mockRunExtractionPipeline.mockRejectedValue(
      new Error('Pipeline failed'),
    )

    const { POST } = await import('@/app/api/ai/extract/route')

    const request = new Request('http://localhost/api/ai/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symptomEventId: '550e8400-e29b-41d4-a716-446655440000',
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(500)
  })
})
