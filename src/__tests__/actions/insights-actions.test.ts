import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetUser = vi.fn()
const mockGetChronologicalFeed = vi.fn()
const mockGetMonthlyTimeline = vi.fn()
const mockGetDayEvents = vi.fn()
const mockGetSymptomRanking = vi.fn()
const mockGetSymptomEvents = vi.fn()

vi.mock('@/lib/db/client', () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}))

vi.mock('@/lib/db/insights', () => ({
  getChronologicalFeed: mockGetChronologicalFeed,
  getMonthlyTimeline: mockGetMonthlyTimeline,
  getDayEvents: mockGetDayEvents,
  getSymptomRanking: mockGetSymptomRanking,
  getSymptomEvents: mockGetSymptomEvents,
  calculateTrend: vi.fn(() => 'stable'),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('loadMoreFeedEvents', () => {
  it('gibt Fehler zurück bei ungültigem Cursor', async () => {
    const { loadMoreFeedEvents } =
      await import('@/lib/actions/insights-actions')
    const result = await loadMoreFeedEvents('nicht-ein-datum')

    expect(result.data).toBeNull()
    expect(result.error).toBeTruthy()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('gibt Fehler zurück wenn nicht authentifiziert', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { loadMoreFeedEvents } =
      await import('@/lib/actions/insights-actions')
    const result = await loadMoreFeedEvents('2026-03-14T09:30:00.000Z')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('AUTH_REQUIRED')
  })

  it('gibt PaginatedFeed zurück bei gültigem Cursor und Auth', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const feedResult = { events: [], nextCursor: null, hasMore: false }
    mockGetChronologicalFeed.mockResolvedValue(feedResult)

    const { loadMoreFeedEvents } =
      await import('@/lib/actions/insights-actions')
    const result = await loadMoreFeedEvents('2026-03-14T09:30:00.000Z')

    expect(result.data).toEqual(feedResult)
    expect(result.error).toBeNull()
    expect(mockGetChronologicalFeed).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      { cursor: '2026-03-14T09:30:00.000Z', limit: 20 },
    )
  })

  it('respektiert benutzerdefiniertes Limit', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockGetChronologicalFeed.mockResolvedValue({
      events: [],
      nextCursor: null,
      hasMore: false,
    })

    const { loadMoreFeedEvents } =
      await import('@/lib/actions/insights-actions')
    await loadMoreFeedEvents('2026-03-14T09:30:00.000Z', 10)

    expect(mockGetChronologicalFeed).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      { cursor: '2026-03-14T09:30:00.000Z', limit: 10 },
    )
  })
})

describe('loadMonthTimeline', () => {
  it('gibt Fehler zurück bei ungültigem Jahr/Monat', async () => {
    const { loadMonthTimeline } = await import('@/lib/actions/insights-actions')
    const result = await loadMonthTimeline(2019, 1)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('gibt Fehler zurück wenn nicht authentifiziert', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { loadMonthTimeline } = await import('@/lib/actions/insights-actions')
    const result = await loadMonthTimeline(2026, 3)

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('AUTH_REQUIRED')
  })

  it('gibt MonthTimeline zurück bei gültigen Parametern und Auth', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const timelineResult = { year: 2026, month: 3, days: [], totalEvents: 0 }
    mockGetMonthlyTimeline.mockResolvedValue(timelineResult)

    const { loadMonthTimeline } = await import('@/lib/actions/insights-actions')
    const result = await loadMonthTimeline(2026, 3)

    expect(result.data).toEqual(timelineResult)
    expect(result.error).toBeNull()
    expect(mockGetMonthlyTimeline).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      2026,
      3,
    )
  })
})

describe('loadDayEvents', () => {
  it('gibt Fehler zurück bei ungültigem Datum', async () => {
    const { loadDayEvents } = await import('@/lib/actions/insights-actions')
    const result = await loadDayEvents('kein-datum')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('gibt Fehler zurück wenn nicht authentifiziert', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { loadDayEvents } = await import('@/lib/actions/insights-actions')
    const result = await loadDayEvents('2026-03-14')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('AUTH_REQUIRED')
  })

  it('gibt FeedEvent-Array zurück bei gültigem Datum und Auth', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockGetDayEvents.mockResolvedValue([])

    const { loadDayEvents } = await import('@/lib/actions/insights-actions')
    const result = await loadDayEvents('2026-03-14')

    expect(result.data).toEqual([])
    expect(result.error).toBeNull()
    expect(mockGetDayEvents).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      '2026-03-14',
    )
  })
})
