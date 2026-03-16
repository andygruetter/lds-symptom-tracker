import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mutable state for mock behavior
let mockUserResult: { data: { user: { id: string } | null } } = {
  data: { user: null },
}
let mockPdfDataResult: unknown = null
let mockPdfDataError: Error | null = null
let mockRenderResult = Buffer.from('PDF_CONTENT')
let mockCookieValue: string | undefined = undefined
let mockSessionResult: unknown = null
let mockLinkResult: unknown = null

// Hoisted vi.mock calls
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) =>
      name === 'sharing_session' && mockCookieValue
        ? { name: 'sharing_session', value: mockCookieValue }
        : undefined,
    getAll: () => [],
    has: () => false,
    set: () => {},
    delete: () => {},
  })),
}))

vi.mock('@/lib/db/client', () => ({
  createServerClient: vi.fn(async () => ({
    auth: {
      getUser: async () => mockUserResult,
    },
  })),
  createServiceClient: vi.fn(() => ({})),
}))

vi.mock('@/lib/db/sharing', () => ({
  validateSharingLinkById: vi.fn(async () => mockLinkResult),
}))

vi.mock('@/lib/sharing/session', () => ({
  parseSharingSession: vi.fn(() => mockSessionResult),
}))

vi.mock('@/lib/pdf/pdf-data', () => ({
  aggregatePdfData: vi.fn(async () => {
    if (mockPdfDataError) throw mockPdfDataError
    return mockPdfDataResult
  }),
}))

vi.mock('@/lib/pdf/symptom-report', () => ({
  SymptomReportDocument: vi.fn(() => null),
}))

vi.mock('@react-pdf/renderer', () => ({
  renderToBuffer: vi.fn(async () => mockRenderResult),
}))

vi.mock('@/lib/db/audit', () => ({
  trackSharingAccess: vi.fn(),
}))

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return { ...actual, createElement: vi.fn(() => ({})) }
})

import { GET } from '@/app/api/report/pdf/route'
import { aggregatePdfData } from '@/lib/pdf/pdf-data'

const samplePdfData = {
  summary: 'Zusammenfassung',
  ranking: [],
  timeline: [],
  events: [],
  metadata: {
    dateFrom: '2026-02-01',
    dateTo: '2026-02-28',
    generatedAt: '2026-03-15T10:00:00Z',
    totalEvents: 0,
  },
}

function makeRequest(url: string): Parameters<typeof GET>[0] {
  const req = new Request(url)
  const parsedUrl = new URL(url)
  return Object.assign(req, { nextUrl: parsedUrl }) as unknown as Parameters<
    typeof GET
  >[0]
}

beforeEach(() => {
  // Reset mutable state
  mockUserResult = { data: { user: null } }
  mockPdfDataResult = samplePdfData
  mockPdfDataError = null
  mockRenderResult = Buffer.from('PDF_CONTENT')
  mockCookieValue = undefined
  mockSessionResult = null
  mockLinkResult = null
  vi.clearAllMocks()
})

describe('GET /api/report/pdf', () => {
  describe('Patient-Auth', () => {
    beforeEach(() => {
      mockUserResult = { data: { user: { id: 'user-123' } } }
    })

    it('gibt 400 zurück wenn startDate fehlt', async () => {
      const res = await GET(
        makeRequest('http://localhost/api/report/pdf?endDate=2026-02-28'),
      )
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error.code).toBe('INVALID_DATE_RANGE')
    })

    it('gibt 400 zurück wenn endDate fehlt', async () => {
      const res = await GET(
        makeRequest('http://localhost/api/report/pdf?startDate=2026-02-01'),
      )
      expect(res.status).toBe(400)
    })

    it('gibt 400 zurück bei ungültigem Datumsformat', async () => {
      const res = await GET(
        makeRequest(
          'http://localhost/api/report/pdf?startDate=bad-date&endDate=2026-02-28',
        ),
      )
      expect(res.status).toBe(400)
    })

    it('generiert PDF für authentifizierten Patienten', async () => {
      const res = await GET(
        makeRequest(
          'http://localhost/api/report/pdf?startDate=2026-02-01&endDate=2026-02-28',
        ),
      )
      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toBe('application/pdf')
      expect(res.headers.get('Content-Disposition')).toContain('attachment')
    })

    it('ruft aggregatePdfData mit korrekten Parametern auf', async () => {
      await GET(
        makeRequest(
          'http://localhost/api/report/pdf?startDate=2026-02-01&endDate=2026-02-28',
        ),
      )
      expect(vi.mocked(aggregatePdfData)).toHaveBeenCalledWith(
        expect.anything(),
        'user-123',
        '2026-02-01',
        '2026-02-28',
      )
    })
  })

  describe('Arzt-Auth', () => {
    it('gibt 401 zurück ohne Auth', async () => {
      const res = await GET(makeRequest('http://localhost/api/report/pdf'))
      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body.error.code).toBe('AUTH_REQUIRED')
    })

    it('gibt 401 zurück bei ungültigem Cookie', async () => {
      mockCookieValue = 'invalid-cookie'
      mockSessionResult = null

      const res = await GET(makeRequest('http://localhost/api/report/pdf'))
      expect(res.status).toBe(401)
    })

    it('generiert PDF für Arzt mit gültigem Cookie', async () => {
      mockCookieValue = 'link-id:123:sig'
      mockSessionResult = {
        linkId: 'link-id',
        expiresAt: 9999999999,
        signature: 'sig',
      }
      mockLinkResult = {
        id: 'link-id',
        accountId: 'account-123',
        dateFrom: '2026-01-01',
        dateTo: '2026-03-01',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      }

      const res = await GET(makeRequest('http://localhost/api/report/pdf'))
      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toBe('application/pdf')
    })
  })

  describe('Error Handling', () => {
    it('gibt 500 bei PDF-Generierungsfehler zurück', async () => {
      mockUserResult = { data: { user: { id: 'user-123' } } }
      mockPdfDataError = new Error('DB Fehler')

      const res = await GET(
        makeRequest(
          'http://localhost/api/report/pdf?startDate=2026-02-01&endDate=2026-02-28',
        ),
      )
      expect(res.status).toBe(500)
      const body = await res.json()
      expect(body.error.code).toBe('PDF_GENERATION_FAILED')
    })
  })
})
