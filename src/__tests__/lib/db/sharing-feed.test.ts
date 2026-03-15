import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock date utility
vi.mock('@/lib/utils/date', () => ({
  toLocalDateKey: (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  },
}))

// Mock createServiceClient
const mockServiceFrom = vi.fn()
vi.mock('@/lib/db/client', () => ({
  createServiceClient: vi.fn(() => ({
    from: mockServiceFrom,
  })),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getSharedFeedEvents', () => {
  it('gibt FeedEvent[] mit allen extrahierten Daten zurück', async () => {
    const mockRows = [
      {
        id: 'evt-1',
        event_type: 'symptom',
        occurred_at: '2026-02-10T10:00:00Z',
        created_at: '2026-02-10T10:00:00Z',
        ended_at: null,
        raw_input: 'Kopfschmerzen rechts',
        audio_url: null,
        extracted_data: [
          { field_name: 'symptom_name', value: 'Kopfschmerzen' },
          { field_name: 'body_region', value: 'Kopf' },
          { field_name: 'side', value: 'rechts' },
          { field_name: 'intensity', value: '7' },
        ],
        event_photos: [{ id: 'photo-1' }],
      },
      {
        id: 'evt-2',
        event_type: 'medication',
        occurred_at: '2026-02-09T08:00:00Z',
        created_at: '2026-02-09T08:00:00Z',
        ended_at: null,
        raw_input: 'Ibuprofen 400mg',
        audio_url: 'audio/path.webm',
        extracted_data: [
          { field_name: 'medication', value: 'Ibuprofen' },
          { field_name: 'dosage', value: '400mg' },
        ],
        event_photos: [],
      },
    ]
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockRows, error: null }),
    }
    mockServiceFrom.mockReturnValue(builder)

    const { getSharedFeedEvents } = await import('@/lib/db/sharing')
    const result = await getSharedFeedEvents(
      'user-1',
      '2026-01-01',
      '2026-03-15',
    )

    expect(result).toHaveLength(2)

    // Symptom-Event
    expect(result[0].id).toBe('evt-1')
    expect(result[0].eventType).toBe('symptom')
    expect(result[0].symptomName).toBe('Kopfschmerzen')
    expect(result[0].bodyRegion).toBe('Kopf')
    expect(result[0].side).toBe('rechts')
    expect(result[0].intensity).toBe(7)
    expect(result[0].photoCount).toBe(1)
    expect(result[0].hasAudio).toBe(false)

    // Medication-Event
    expect(result[1].id).toBe('evt-2')
    expect(result[1].eventType).toBe('medication')
    expect(result[1].medication).toBe('Ibuprofen')
    expect(result[1].dosage).toBe('400mg')
    expect(result[1].hasAudio).toBe(true)
  })

  it('sendet korrekte Query-Parameter (account_id, dateFrom, dateTo, confirmed, deleted_at)', async () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    mockServiceFrom.mockReturnValue(builder)

    const { getSharedFeedEvents } = await import('@/lib/db/sharing')
    await getSharedFeedEvents('acc-123', '2026-01-01', '2026-06-30')

    expect(mockServiceFrom).toHaveBeenCalledWith('symptom_events')
    expect(builder.eq).toHaveBeenCalledWith('account_id', 'acc-123')
    expect(builder.eq).toHaveBeenCalledWith('status', 'confirmed')
    expect(builder.is).toHaveBeenCalledWith('deleted_at', null)
    // Buffered dates: dateFrom -1 day, dateTo +1 day (lt = exclusive)
    expect(builder.gte).toHaveBeenCalledWith(
      'occurred_at',
      expect.stringContaining('2025-12-31'),
    )
    expect(builder.lt).toHaveBeenCalledWith(
      'occurred_at',
      expect.stringContaining('2026-07-01'),
    )
    expect(builder.order).toHaveBeenCalledWith('occurred_at', {
      ascending: false,
    })
  })

  it('gibt leeres Array zurück bei DB-Fehler', async () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'DB error' } }),
    }
    mockServiceFrom.mockReturnValue(builder)

    const { getSharedFeedEvents } = await import('@/lib/db/sharing')
    const result = await getSharedFeedEvents(
      'user-1',
      '2026-01-01',
      '2026-03-15',
    )

    expect(result).toEqual([])
  })

  it('gibt leeres Array zurück wenn keine Events im Zeitraum', async () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    mockServiceFrom.mockReturnValue(builder)

    const { getSharedFeedEvents } = await import('@/lib/db/sharing')
    const result = await getSharedFeedEvents(
      'user-1',
      '2026-01-01',
      '2026-01-02',
    )

    expect(result).toEqual([])
  })

  it('nutzt SELECT mit JOIN auf extracted_data und event_photos', async () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    mockServiceFrom.mockReturnValue(builder)

    const { getSharedFeedEvents } = await import('@/lib/db/sharing')
    await getSharedFeedEvents('user-1', '2026-01-01', '2026-03-15')

    expect(builder.select).toHaveBeenCalledWith(
      'id, event_type, occurred_at, created_at, ended_at, raw_input, audio_url, extracted_data(field_name, value), event_photos(id)',
    )
  })
})
