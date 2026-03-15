import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock createServiceClient
const mockFrom = vi.fn()
vi.mock('@/lib/db/client', () => ({
  createServiceClient: vi.fn(() => ({ from: mockFrom })),
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
})

// Helper: Query-Builder für SELECT .single()
function createSelectSingleMock(result: { data: unknown; error: unknown }) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
    update: vi.fn().mockReturnThis(),
  }
  return builder
}

// Helper: Query-Builder für UPSERT
function createUpsertMock(result: { data: unknown; error: unknown }) {
  const builder = {
    upsert: vi.fn().mockResolvedValue(result),
  }
  return builder
}

// Helper: Query-Builder für UPDATE
function createUpdateMock(result: { data: unknown; error: unknown }) {
  const builder = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue(result),
  }
  return builder
}

describe('getCachedSummary', () => {
  it('gibt CachedSummary zurück wenn vorhanden (Cache Hit)', async () => {
    const selectBuilder = createSelectSingleMock({
      data: {
        summary_text: 'KI-Zusammenfassung Text',
        generated_at: '2026-03-10T10:00:00Z',
        event_count: 5,
      },
      error: null,
    })
    mockFrom.mockReturnValue(selectBuilder)

    const { getCachedSummary } = await import('@/lib/db/summaries')
    const result = await getCachedSummary('link-1')

    expect(result).toEqual({
      summaryText: 'KI-Zusammenfassung Text',
      generatedAt: '2026-03-10T10:00:00Z',
      eventCount: 5,
    })
    expect(mockFrom).toHaveBeenCalledWith('sharing_summaries')
  })

  it('gibt null zurück wenn keine Summary vorhanden (Cache Miss)', async () => {
    const selectBuilder = createSelectSingleMock({
      data: null,
      error: { code: 'PGRST116', message: 'Row not found' },
    })
    mockFrom.mockReturnValue(selectBuilder)

    const { getCachedSummary } = await import('@/lib/db/summaries')
    const result = await getCachedSummary('link-1')

    expect(result).toBeNull()
  })

  it('gibt null zurück bei DB-Fehler', async () => {
    const selectBuilder = createSelectSingleMock({
      data: null,
      error: { code: 'DB_ERROR', message: 'Verbindungsfehler' },
    })
    mockFrom.mockReturnValue(selectBuilder)

    const { getCachedSummary } = await import('@/lib/db/summaries')
    const result = await getCachedSummary('link-1')

    expect(result).toBeNull()
  })
})

describe('saveSummary', () => {
  it('führt UPSERT mit korrekten Daten durch', async () => {
    const upsertBuilder = createUpsertMock({ data: null, error: null })
    mockFrom.mockReturnValue(upsertBuilder)

    const { saveSummary } = await import('@/lib/db/summaries')
    await saveSummary('link-1', 'Zusammenfassung Text', 10)

    expect(mockFrom).toHaveBeenCalledWith('sharing_summaries')
    expect(upsertBuilder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        sharing_link_id: 'link-1',
        summary_text: 'Zusammenfassung Text',
        event_count: 10,
        invalidated_at: null,
      }),
      { onConflict: 'sharing_link_id' },
    )
  })
})

describe('checkSummaryFreshness', () => {
  it('gibt true zurück wenn keine neuen Events (frische Summary)', async () => {
    const summaryResult = {
      data: { generated_at: '2026-03-10T12:00:00Z', id: 'sum-1' },
      error: null,
    }
    const eventResult = {
      data: { created_at: '2026-03-10T10:00:00Z' }, // vor generated_at
      error: null,
    }

    mockFrom
      .mockReturnValueOnce(createSelectSingleMock(summaryResult))
      .mockReturnValueOnce(createSelectSingleMock(eventResult))

    const { checkSummaryFreshness } = await import('@/lib/db/summaries')
    const result = await checkSummaryFreshness(
      'link-1',
      'account-1',
      '2026-03-01',
      '2026-03-15',
    )

    expect(result).toBe(true)
  })

  it('gibt false zurück und invalidiert wenn neue Events vorhanden (stale Summary)', async () => {
    const summaryResult = {
      data: { generated_at: '2026-03-10T10:00:00Z', id: 'sum-1' },
      error: null,
    }
    const eventResult = {
      data: { created_at: '2026-03-10T12:00:00Z' }, // nach generated_at
      error: null,
    }
    const updateBuilder = createUpdateMock({ data: null, error: null })

    mockFrom
      .mockReturnValueOnce(createSelectSingleMock(summaryResult))
      .mockReturnValueOnce(createSelectSingleMock(eventResult))
      .mockReturnValueOnce(updateBuilder)

    const { checkSummaryFreshness } = await import('@/lib/db/summaries')
    const result = await checkSummaryFreshness(
      'link-1',
      'account-1',
      '2026-03-01',
      '2026-03-15',
    )

    expect(result).toBe(false)
    expect(updateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({ invalidated_at: expect.any(String) }),
    )
  })

  it('gibt false zurück wenn keine Summary gefunden', async () => {
    const summaryResult = {
      data: null,
      error: { code: 'PGRST116', message: 'Not found' },
    }
    mockFrom.mockReturnValue(createSelectSingleMock(summaryResult))

    const { checkSummaryFreshness } = await import('@/lib/db/summaries')
    const result = await checkSummaryFreshness(
      'link-1',
      'account-1',
      '2026-03-01',
      '2026-03-15',
    )

    expect(result).toBe(false)
  })

  it('gibt true zurück wenn keine Events im Zeitraum (Summary ist frisch)', async () => {
    const summaryResult = {
      data: { generated_at: '2026-03-10T10:00:00Z', id: 'sum-1' },
      error: null,
    }
    const eventResult = {
      data: null,
      error: { code: 'PGRST116', message: 'No rows' },
    }

    mockFrom
      .mockReturnValueOnce(createSelectSingleMock(summaryResult))
      .mockReturnValueOnce(createSelectSingleMock(eventResult))

    const { checkSummaryFreshness } = await import('@/lib/db/summaries')
    const result = await checkSummaryFreshness(
      'link-1',
      'account-1',
      '2026-03-01',
      '2026-03-15',
    )

    expect(result).toBe(true)
  })
})
