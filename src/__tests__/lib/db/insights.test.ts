import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  EventDetail,
  MonthTimeline,
  MonthlyCount,
  PaginatedFeed,
} from '@/types/analytics'

// Mock media module for getEventDetail tests
vi.mock('@/lib/db/media', () => ({
  getSignedAudioUrl: vi.fn().mockResolvedValue('https://signed.url/audio.webm'),
  getSignedPhotoUrl: vi.fn().mockResolvedValue('https://signed.url/photo.jpg'),
}))

function createMockSupabase(result = { data: [], error: null }) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(result),
  }
  return {
    from: vi.fn(() => builder),
    _builder: builder,
  }
}

function createMockSupabaseTimeline(result = { data: [], error: null }) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue(result),
  }
  return {
    from: vi.fn(() => builder),
    _builder: builder,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getChronologicalFeed', () => {
  it('gibt leeres Ergebnis zurück wenn keine Events vorhanden', async () => {
    const supabase = createMockSupabase({ data: [], error: null })

    const { getChronologicalFeed } = await import('@/lib/db/insights')
    const result = await getChronologicalFeed(supabase as never, 'user-1')

    expect(result).toEqual<PaginatedFeed>({
      events: [],
      nextCursor: null,
      hasMore: false,
    })
  })

  it('fragt symptom_events mit korrekten Filtern ab (kein Cursor)', async () => {
    const supabase = createMockSupabase({ data: [], error: null })

    const { getChronologicalFeed } = await import('@/lib/db/insights')
    await getChronologicalFeed(supabase as never, 'user-1')

    expect(supabase.from).toHaveBeenCalledWith('symptom_events')
    expect(supabase._builder.eq).toHaveBeenCalledWith('account_id', 'user-1')
    expect(supabase._builder.eq).toHaveBeenCalledWith('status', 'confirmed')
    expect(supabase._builder.is).toHaveBeenCalledWith('deleted_at', null)
    expect(supabase._builder.order).toHaveBeenCalledWith('occurred_at', {
      ascending: false,
    })
    expect(supabase._builder.lt).not.toHaveBeenCalled()
  })

  it('wendet Cursor-Filter an wenn Cursor vorhanden', async () => {
    const supabase = createMockSupabase({ data: [], error: null })
    const cursor = '2026-03-14T09:00:00Z'

    const { getChronologicalFeed } = await import('@/lib/db/insights')
    await getChronologicalFeed(supabase as never, 'user-1', { cursor })

    expect(supabase._builder.lt).toHaveBeenCalledWith('occurred_at', cursor)
  })

  it('mappt DB-Zeile korrekt zu FeedEvent (Symptom)', async () => {
    const dbRow = {
      id: 'event-1',
      event_type: 'symptom',
      occurred_at: '2026-03-14T09:30:00Z',
      created_at: '2026-03-14T09:30:00Z',
      ended_at: null,
      raw_input: 'Rückenschmerzen',
      audio_url: null,
      extracted_data: [
        { field_name: 'symptom_name', value: 'Rückenschmerzen' },
        { field_name: 'body_region', value: 'Rücken' },
        { field_name: 'side', value: 'links' },
        { field_name: 'symptom_type', value: 'stechend' },
        { field_name: 'intensity', value: '7' },
      ],
      event_photos: [{ id: 'photo-1' }, { id: 'photo-2' }],
    }
    const supabase = createMockSupabase({ data: [dbRow], error: null })

    const { getChronologicalFeed } = await import('@/lib/db/insights')
    const result = await getChronologicalFeed(supabase as never, 'user-1')

    expect(result.events[0]).toMatchObject({
      id: 'event-1',
      eventType: 'symptom',
      occurredAt: '2026-03-14T09:30:00Z',
      symptomName: 'Rückenschmerzen',
      bodyRegion: 'Rücken',
      side: 'links',
      symptomType: 'stechend',
      intensity: 7,
      medication: null,
      dosage: null,
      photoCount: 2,
      hasAudio: false,
    })
  })

  it('mappt DB-Zeile korrekt zu FeedEvent (Medikament mit Audio)', async () => {
    const dbRow = {
      id: 'event-2',
      event_type: 'medication',
      occurred_at: '2026-03-13T20:15:00Z',
      created_at: '2026-03-13T20:15:00Z',
      ended_at: null,
      raw_input: 'Dafalgan 1g',
      audio_url: 'audio/user-1/event-2/recording.webm',
      extracted_data: [
        { field_name: 'medication', value: 'Dafalgan' },
        { field_name: 'dosage', value: '1g' },
      ],
      event_photos: [],
    }
    const supabase = createMockSupabase({ data: [dbRow], error: null })

    const { getChronologicalFeed } = await import('@/lib/db/insights')
    const result = await getChronologicalFeed(supabase as never, 'user-1')

    expect(result.events[0]).toMatchObject({
      id: 'event-2',
      eventType: 'medication',
      medication: 'Dafalgan',
      dosage: '1g',
      symptomName: null,
      photoCount: 0,
      hasAudio: true,
    })
  })

  it('mappt event_type "voice" als "symptom"', async () => {
    const dbRow = {
      id: 'event-3',
      event_type: 'voice',
      occurred_at: '2026-03-14T10:00:00Z',
      created_at: '2026-03-14T10:00:00Z',
      ended_at: null,
      raw_input: 'Kopfschmerzen per Sprache',
      audio_url: 'audio/user-1/event-3/recording.webm',
      extracted_data: [{ field_name: 'symptom_name', value: 'Kopfschmerzen' }],
      event_photos: [],
    }
    const supabase = createMockSupabase({ data: [dbRow], error: null })

    const { getChronologicalFeed } = await import('@/lib/db/insights')
    const result = await getChronologicalFeed(supabase as never, 'user-1')

    expect(result.events[0]).toMatchObject({
      id: 'event-3',
      eventType: 'symptom',
      symptomName: 'Kopfschmerzen',
      hasAudio: true,
    })
  })

  it('berechnet nextCursor korrekt (occurred_at des letzten Events)', async () => {
    const dbRows = [
      {
        id: 'event-1',
        event_type: 'symptom',
        occurred_at: '2026-03-14T09:30:00Z',
        created_at: '2026-03-14T09:30:00Z',
        ended_at: null,
        raw_input: 'Test',
        audio_url: null,
        extracted_data: [],
        event_photos: [],
      },
      {
        id: 'event-2',
        event_type: 'symptom',
        occurred_at: '2026-03-13T08:00:00Z',
        created_at: '2026-03-13T08:00:00Z',
        ended_at: null,
        raw_input: 'Test 2',
        audio_url: null,
        extracted_data: [],
        event_photos: [],
      },
    ]
    const supabase = createMockSupabase({ data: dbRows, error: null })

    const { getChronologicalFeed } = await import('@/lib/db/insights')
    const result = await getChronologicalFeed(supabase as never, 'user-1', {
      limit: 2,
    })

    expect(result.nextCursor).toBe('2026-03-13T08:00:00Z')
    expect(result.hasMore).toBe(true)
  })

  it('setzt hasMore=false wenn weniger Events als limit zurückgegeben', async () => {
    const dbRow = {
      id: 'event-1',
      event_type: 'symptom',
      occurred_at: '2026-03-14T09:30:00Z',
      created_at: '2026-03-14T09:30:00Z',
      ended_at: null,
      raw_input: 'Test',
      audio_url: null,
      extracted_data: [],
      event_photos: [],
    }
    const supabase = createMockSupabase({ data: [dbRow], error: null })

    const { getChronologicalFeed } = await import('@/lib/db/insights')
    const result = await getChronologicalFeed(supabase as never, 'user-1', {
      limit: 20,
    })

    expect(result.hasMore).toBe(false)
    expect(result.nextCursor).toBe('2026-03-14T09:30:00Z')
  })

  it('gibt leeres Ergebnis zurück bei DB-Fehler', async () => {
    const supabase = createMockSupabase({
      data: null,
      error: { message: 'DB error' },
    })

    const { getChronologicalFeed } = await import('@/lib/db/insights')
    const result = await getChronologicalFeed(supabase as never, 'user-1')

    expect(result).toEqual<PaginatedFeed>({
      events: [],
      nextCursor: null,
      hasMore: false,
    })
  })
})

function createMockSupabaseDayEvents(result = { data: [], error: null }) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue(result),
  }
  return {
    from: vi.fn(() => builder),
    _builder: builder,
  }
}

describe('getDayEvents', () => {
  it('gibt leeres Array zurück wenn keine Events vorhanden', async () => {
    const supabase = createMockSupabaseDayEvents({ data: [], error: null })

    const { getDayEvents } = await import('@/lib/db/insights')
    const result = await getDayEvents(supabase as never, 'user-1', '2026-03-14')

    expect(result).toEqual([])
  })

  it('filtert Events korrekt auf den angegebenen Tag', async () => {
    const dbRows = [
      {
        id: 'ev-1',
        event_type: 'symptom',
        occurred_at: '2026-03-14T09:30:00.000+01:00',
        created_at: '2026-03-14T09:30:00.000+01:00',
        ended_at: null,
        raw_input: 'Kopfschmerzen',
        audio_url: null,
        extracted_data: [
          { field_name: 'symptom_name', value: 'Kopfschmerzen' },
        ],
        event_photos: [],
      },
      {
        id: 'ev-2',
        event_type: 'medication',
        occurred_at: '2026-03-13T23:00:00.000+01:00',
        created_at: '2026-03-13T23:00:00.000+01:00',
        ended_at: null,
        raw_input: 'Dafalgan',
        audio_url: null,
        extracted_data: [],
        event_photos: [],
      },
    ]
    const supabase = createMockSupabaseDayEvents({ data: dbRows, error: null })

    const { getDayEvents } = await import('@/lib/db/insights')
    const result = await getDayEvents(supabase as never, 'user-1', '2026-03-14')

    // Only ev-1 falls on March 14 in local timezone
    const ids = result.map((e) => e.id)
    expect(ids).toContain('ev-1')
  })

  it('mappt Ergebnis korrekt zu FeedEvent', async () => {
    const dbRow = {
      id: 'ev-1',
      event_type: 'symptom',
      occurred_at: '2026-03-14T09:30:00.000+01:00',
      created_at: '2026-03-14T09:30:00.000+01:00',
      ended_at: null,
      raw_input: 'Rückenschmerzen',
      audio_url: 'audio/test.webm',
      extracted_data: [
        { field_name: 'symptom_name', value: 'Rückenschmerzen' },
        { field_name: 'intensity', value: '6' },
      ],
      event_photos: [{ id: 'p1' }],
    }
    const supabase = createMockSupabaseDayEvents({ data: [dbRow], error: null })

    const { getDayEvents } = await import('@/lib/db/insights')
    const result = await getDayEvents(supabase as never, 'user-1', '2026-03-14')

    expect(result[0]).toMatchObject({
      id: 'ev-1',
      eventType: 'symptom',
      symptomName: 'Rückenschmerzen',
      intensity: 6,
      photoCount: 1,
      hasAudio: true,
    })
  })

  it('gibt leeres Array zurück bei DB-Fehler', async () => {
    const supabase = createMockSupabaseDayEvents({
      data: null,
      error: { message: 'DB error' },
    })

    const { getDayEvents } = await import('@/lib/db/insights')
    const result = await getDayEvents(supabase as never, 'user-1', '2026-03-14')

    expect(result).toEqual([])
  })
})

function createMockSupabaseRanking(result = { data: [], error: null }) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue(result),
  }
  return {
    from: vi.fn(() => builder),
    _builder: builder,
  }
}

describe('calculateTrend', () => {
  it('gibt stable zurück bei weniger als 2 Datenpunkten', async () => {
    const { calculateTrend } = await import('@/lib/db/insights')
    const counts: MonthlyCount[] = [{ year: 2026, month: 3, count: 5 }]
    expect(calculateTrend(counts)).toBe('stable')
    expect(calculateTrend([])).toBe('stable')
  })

  it('gibt increasing zurück bei steigendem Trend', async () => {
    const { calculateTrend } = await import('@/lib/db/insights')
    const counts: MonthlyCount[] = [
      { year: 2026, month: 1, count: 2 },
      { year: 2026, month: 2, count: 5 },
      { year: 2026, month: 3, count: 9 },
    ]
    expect(calculateTrend(counts)).toBe('increasing')
  })

  it('gibt decreasing zurück bei sinkendem Trend', async () => {
    const { calculateTrend } = await import('@/lib/db/insights')
    const counts: MonthlyCount[] = [
      { year: 2026, month: 1, count: 9 },
      { year: 2026, month: 2, count: 5 },
      { year: 2026, month: 3, count: 1 },
    ]
    expect(calculateTrend(counts)).toBe('decreasing')
  })
})

describe('getSymptomRanking', () => {
  it('gibt leeres Ranking zurück wenn keine Events vorhanden', async () => {
    const supabase = createMockSupabaseRanking({ data: [], error: null })

    const { getSymptomRanking } = await import('@/lib/db/insights')
    const result = await getSymptomRanking(supabase as never, 'user-1', '3m')

    expect(result.symptoms).toHaveLength(0)
    expect(result.medications).toHaveLength(0)
    expect(result.totalSymptomEvents).toBe(0)
    expect(result.totalMedicationEvents).toBe(0)
    expect(result.timeRange).toBe('3m')
  })

  it('aggregiert Symptome korrekt nach Name', async () => {
    const dbRows = [
      {
        id: 'ev-1',
        event_type: 'symptom',
        occurred_at: '2026-03-14T09:00:00.000+01:00',
        extracted_data: [
          { field_name: 'symptom_name', value: 'Kopfschmerzen' },
        ],
      },
      {
        id: 'ev-2',
        event_type: 'symptom',
        occurred_at: '2026-03-10T09:00:00.000+01:00',
        extracted_data: [
          { field_name: 'symptom_name', value: 'Kopfschmerzen' },
        ],
      },
      {
        id: 'ev-3',
        event_type: 'symptom',
        occurred_at: '2026-03-05T09:00:00.000+01:00',
        extracted_data: [
          { field_name: 'symptom_name', value: 'Rückenschmerzen' },
        ],
      },
    ]
    const supabase = createMockSupabaseRanking({ data: dbRows, error: null })

    const { getSymptomRanking } = await import('@/lib/db/insights')
    const result = await getSymptomRanking(supabase as never, 'user-1', '3m')

    expect(result.symptoms[0].name).toBe('Kopfschmerzen')
    expect(result.symptoms[0].totalCount).toBe(2)
    expect(result.symptoms[1].name).toBe('Rückenschmerzen')
    expect(result.symptoms[1].totalCount).toBe(1)
  })

  it('aggregiert Medikamente separat von Symptomen', async () => {
    const dbRows = [
      {
        id: 'ev-1',
        event_type: 'medication',
        occurred_at: '2026-03-14T09:00:00.000+01:00',
        extracted_data: [{ field_name: 'medication', value: 'Dafalgan' }],
      },
      {
        id: 'ev-2',
        event_type: 'symptom',
        occurred_at: '2026-03-14T10:00:00.000+01:00',
        extracted_data: [
          { field_name: 'symptom_name', value: 'Kopfschmerzen' },
        ],
      },
    ]
    const supabase = createMockSupabaseRanking({ data: dbRows, error: null })

    const { getSymptomRanking } = await import('@/lib/db/insights')
    const result = await getSymptomRanking(supabase as never, 'user-1', '3m')

    expect(result.symptoms).toHaveLength(1)
    expect(result.symptoms[0].name).toBe('Kopfschmerzen')
    expect(result.medications).toHaveLength(1)
    expect(result.medications[0].name).toBe('Dafalgan')
  })

  it('gibt leeres Ranking zurück bei DB-Fehler', async () => {
    const supabase = createMockSupabaseRanking({
      data: null,
      error: { message: 'DB error' },
    })

    const { getSymptomRanking } = await import('@/lib/db/insights')
    const result = await getSymptomRanking(supabase as never, 'user-1', '3m')

    expect(result.symptoms).toHaveLength(0)
    expect(result.medications).toHaveLength(0)
  })
})

describe('getMonthlyTimeline', () => {
  it('gibt leeren Monat zurück wenn keine Events vorhanden', async () => {
    const supabase = createMockSupabaseTimeline({ data: [], error: null })

    const { getMonthlyTimeline } = await import('@/lib/db/insights')
    const result = await getMonthlyTimeline(
      supabase as never,
      'user-1',
      2026,
      3,
    )

    expect(result.year).toBe(2026)
    expect(result.month).toBe(3)
    expect(result.totalEvents).toBe(0)
    expect(result.days).toHaveLength(31) // März hat 31 Tage
    expect(result.days.every((d) => d.totalCount === 0)).toBe(true)
  })

  it('aggregiert Symptom- und Medikament-Events korrekt', async () => {
    const dbRows = [
      {
        id: 'ev-1',
        event_type: 'symptom',
        occurred_at: '2026-03-14T09:30:00.000+01:00',
        extracted_data: [{ field_name: 'intensity', value: '7' }],
      },
      {
        id: 'ev-2',
        event_type: 'medication',
        occurred_at: '2026-03-14T20:00:00.000+01:00',
        extracted_data: [],
      },
    ]
    const supabase = createMockSupabaseTimeline({ data: dbRows, error: null })

    const { getMonthlyTimeline } = await import('@/lib/db/insights')
    const result = await getMonthlyTimeline(
      supabase as never,
      'user-1',
      2026,
      3,
    )

    // Beide Events am 14. März (lokale Zeit +01:00)
    const day14 = result.days.find((d) => d.date === '2026-03-14')
    expect(day14).toBeDefined()
    expect(day14!.symptomCount).toBe(1)
    expect(day14!.medicationCount).toBe(1)
    expect(day14!.totalCount).toBe(2)
  })

  it('berechnet maxIntensity korrekt', async () => {
    const dbRows = [
      {
        id: 'ev-1',
        event_type: 'symptom',
        occurred_at: '2026-03-14T09:00:00.000+01:00',
        extracted_data: [{ field_name: 'intensity', value: '5' }],
      },
      {
        id: 'ev-2',
        event_type: 'symptom',
        occurred_at: '2026-03-14T15:00:00.000+01:00',
        extracted_data: [{ field_name: 'intensity', value: '9' }],
      },
    ]
    const supabase = createMockSupabaseTimeline({ data: dbRows, error: null })

    const { getMonthlyTimeline } = await import('@/lib/db/insights')
    const result = await getMonthlyTimeline(
      supabase as never,
      'user-1',
      2026,
      3,
    )

    const day14 = result.days.find((d) => d.date === '2026-03-14')
    expect(day14!.maxIntensity).toBe(9)
  })

  it('behandelt event_type "voice" als Symptom', async () => {
    const dbRows = [
      {
        id: 'ev-1',
        event_type: 'voice',
        occurred_at: '2026-03-10T10:00:00.000+01:00',
        extracted_data: [],
      },
    ]
    const supabase = createMockSupabaseTimeline({ data: dbRows, error: null })

    const { getMonthlyTimeline } = await import('@/lib/db/insights')
    const result = await getMonthlyTimeline(
      supabase as never,
      'user-1',
      2026,
      3,
    )

    const day10 = result.days.find((d) => d.date === '2026-03-10')
    expect(day10!.symptomCount).toBe(1)
    expect(day10!.medicationCount).toBe(0)
  })
})

// Helper: create a mock supabase for getEventDetail with per-table responses
function createMockSupabaseEventDetail({
  eventRow = null as Record<string, unknown> | null,
  eventError = null as { message: string } | null,
  extractedRows = [] as Record<string, unknown>[],
  photoRows = [] as Record<string, unknown>[],
} = {}) {
  const singleResult = { data: eventRow, error: eventError }
  const extractedResult = { data: extractedRows, error: null }
  const photosResult = { data: photoRows, error: null }

  let callCount = 0

  // Builders must be thenable so `await builder.eq(...)` works when query ends without .single()
  const makeBuilder = (resolvedWith: unknown) => {
    const builder: Record<string, unknown> & {
      then: (
        resolve: (v: unknown) => unknown,
        reject?: (e: unknown) => unknown,
      ) => Promise<unknown>
    } = {
      order: vi.fn().mockResolvedValue(resolvedWith),
      single: vi.fn().mockResolvedValue(resolvedWith),
      then: (resolve, reject) =>
        Promise.resolve(resolvedWith).then(resolve, reject),
      select: vi.fn(),
      eq: vi.fn(),
      is: vi.fn(),
    }
    ;(builder.select as ReturnType<typeof vi.fn>).mockReturnValue(builder)
    ;(builder.eq as ReturnType<typeof vi.fn>).mockReturnValue(builder)
    ;(builder.is as ReturnType<typeof vi.fn>).mockReturnValue(builder)
    return builder
  }

  const builders = [
    makeBuilder(singleResult), // symptom_events
    makeBuilder(extractedResult), // extracted_data
    makeBuilder(photosResult), // event_photos
  ]

  return {
    from: vi.fn(() => {
      const builder = builders[callCount] ?? builders[builders.length - 1]
      callCount++
      return builder
    }),
  }
}

const baseEvent = {
  id: 'event-abc',
  account_id: 'user-1',
  event_type: 'symptom',
  occurred_at: '2026-03-14T09:30:00Z',
  created_at: '2026-03-14T09:30:00Z',
  ended_at: null,
  raw_input: 'Rückenschmerzen links',
  audio_url: null,
  status: 'confirmed',
  deleted_at: null,
}

describe('getEventDetail', () => {
  it('lädt Event mit allen Daten (Felder, kein Audio, keine Fotos)', async () => {
    const extractedRows = [
      {
        field_name: 'symptom_name',
        value: 'Rückenschmerzen',
        confidence: 90,
        confirmed: true,
      },
      {
        field_name: 'body_region',
        value: 'Rücken',
        confidence: 80,
        confirmed: false,
      },
    ]
    const supabase = createMockSupabaseEventDetail({
      eventRow: baseEvent,
      extractedRows,
      photoRows: [],
    })

    const { getEventDetail } = await import('@/lib/db/insights')
    const result = await getEventDetail(
      supabase as never,
      'event-abc',
      'user-1',
    )

    expect(result).not.toBeNull()
    expect(result!.id).toBe('event-abc')
    expect(result!.eventType).toBe('symptom')
    expect(result!.rawInput).toBe('Rückenschmerzen links')
    expect(result!.extractedFields).toHaveLength(2)
    expect(result!.extractedFields[0].fieldName).toBe('symptom_name')
    expect(result!.extractedFields[0].confidence).toBe(90)
    expect(result!.extractedFields[0].confirmed).toBe(true)
    expect(result!.photos).toHaveLength(0)
    expect(result!.audioUrl).toBeNull()
  })

  it('generiert Signed URL für Audio und Fotos', async () => {
    const { getSignedAudioUrl, getSignedPhotoUrl } =
      await import('@/lib/db/media')
    const photoRows = [
      { id: 'photo-1', storage_path: 'user-1/event-abc/photo.jpg' },
    ]
    const supabase = createMockSupabaseEventDetail({
      eventRow: { ...baseEvent, audio_url: 'user-1/event-abc.webm' },
      extractedRows: [],
      photoRows,
    })

    const { getEventDetail } = await import('@/lib/db/insights')
    const result = await getEventDetail(
      supabase as never,
      'event-abc',
      'user-1',
    )

    expect(result).not.toBeNull()
    expect(getSignedAudioUrl).toHaveBeenCalled()
    expect(result!.audioUrl).toBe('https://signed.url/audio.webm')
    expect(getSignedPhotoUrl).toHaveBeenCalled()
    expect(result!.photos).toHaveLength(1)
    expect(result!.photos[0].id).toBe('photo-1')
    expect(result!.photos[0].signedUrl).toBe('https://signed.url/photo.jpg')
  })

  it('gibt null zurück bei nicht gefundenem Event (Ownership-Check)', async () => {
    const supabase = createMockSupabaseEventDetail({
      eventRow: null,
      eventError: { message: 'No rows' },
    })

    const { getEventDetail } = await import('@/lib/db/insights')
    const result = await getEventDetail(
      supabase as never,
      'event-abc',
      'user-2',
    )

    expect(result).toBeNull()
  })

  it('gibt null zurück bei gelöschtem Event', async () => {
    const supabase = createMockSupabaseEventDetail({
      eventRow: null,
      eventError: { message: 'No rows' },
    })

    const { getEventDetail } = await import('@/lib/db/insights')
    const result = await getEventDetail(
      supabase as never,
      'event-abc',
      'user-1',
    )

    expect(result).toBeNull()
  })

  it('lädt Medikament-Event korrekt', async () => {
    const medicationEvent = {
      ...baseEvent,
      id: 'med-event-1',
      event_type: 'medication',
      raw_input: 'Dafalgan 1g',
      audio_url: null,
    }
    const extractedRows = [
      {
        field_name: 'medication',
        value: 'Dafalgan',
        confidence: 95,
        confirmed: true,
      },
      { field_name: 'dosage', value: '1g', confidence: 85, confirmed: false },
    ]
    const supabase = createMockSupabaseEventDetail({
      eventRow: medicationEvent,
      extractedRows,
      photoRows: [],
    })

    const { getEventDetail } = await import('@/lib/db/insights')
    const result = await getEventDetail(
      supabase as never,
      'med-event-1',
      'user-1',
    )

    expect(result).not.toBeNull()
    expect(result!.eventType).toBe('medication')
    expect(result!.medication).toBe('Dafalgan')
    expect(result!.symptomName).toBeNull()
  })

  it('lädt Event ohne Audio und Fotos korrekt (audioUrl null, photos leer)', async () => {
    const supabase = createMockSupabaseEventDetail({
      eventRow: baseEvent,
      extractedRows: [],
      photoRows: [],
    })

    const { getEventDetail } = await import('@/lib/db/insights')
    const result = await getEventDetail(
      supabase as never,
      'event-abc',
      'user-1',
    )

    expect(result).not.toBeNull()
    expect(result!.audioUrl).toBeNull()
    expect(result!.photos).toHaveLength(0)
  })
})

// Mock supabase for soft-delete operations (UPDATE with select chaining)
function createMockSupabaseDelete(selectResult: {
  data: Record<string, unknown>[] | null
  error: { message: string } | null
}) {
  const builder = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    select: vi.fn().mockResolvedValue(selectResult),
  }
  return {
    from: vi.fn(() => builder),
    _builder: builder,
  }
}

describe('softDeleteEvent', () => {
  it('setzt deleted_at und gibt keinen Fehler zurück bei Erfolg', async () => {
    const supabase = createMockSupabaseDelete({
      data: [{ id: 'event-1' }],
      error: null,
    })

    const { softDeleteEvent } = await import('@/lib/db/insights')
    const result = await softDeleteEvent(supabase as never, 'event-1', 'user-1')

    expect(result.error).toBeNull()
    expect(supabase.from).toHaveBeenCalledWith('symptom_events')
    expect(supabase._builder.update).toHaveBeenCalledWith({
      deleted_at: expect.any(String),
    })
    expect(supabase._builder.eq).toHaveBeenCalledWith('id', 'event-1')
    expect(supabase._builder.eq).toHaveBeenCalledWith('account_id', 'user-1')
    expect(supabase._builder.is).toHaveBeenCalledWith('deleted_at', null)
  })

  it('gibt NOT_FOUND zurück wenn kein Event gefunden', async () => {
    const supabase = createMockSupabaseDelete({
      data: [],
      error: null,
    })

    const { softDeleteEvent } = await import('@/lib/db/insights')
    const result = await softDeleteEvent(
      supabase as never,
      'nonexistent',
      'user-1',
    )

    expect(result.error).not.toBeNull()
    expect(result.error!.code).toBe('NOT_FOUND')
  })

  it('gibt DELETE_FAILED zurück bei DB-Fehler', async () => {
    const supabase = createMockSupabaseDelete({
      data: null,
      error: { message: 'DB error' },
    })

    const { softDeleteEvent } = await import('@/lib/db/insights')
    const result = await softDeleteEvent(supabase as never, 'event-1', 'user-1')

    expect(result.error).not.toBeNull()
    expect(result.error!.code).toBe('DELETE_FAILED')
  })
})

describe('softDeleteAllEvents', () => {
  it('löscht alle Events und gibt deletedCount zurück', async () => {
    const supabase = createMockSupabaseDelete({
      data: [{ id: 'ev-1' }, { id: 'ev-2' }, { id: 'ev-3' }],
      error: null,
    })

    const { softDeleteAllEvents } = await import('@/lib/db/insights')
    const result = await softDeleteAllEvents(supabase as never, 'user-1')

    expect(result.error).toBeNull()
    expect(result.deletedCount).toBe(3)
    expect(supabase._builder.eq).toHaveBeenCalledWith('account_id', 'user-1')
    expect(supabase._builder.is).toHaveBeenCalledWith('deleted_at', null)
  })

  it('gibt deletedCount 0 zurück wenn keine Events vorhanden', async () => {
    const supabase = createMockSupabaseDelete({
      data: [],
      error: null,
    })

    const { softDeleteAllEvents } = await import('@/lib/db/insights')
    const result = await softDeleteAllEvents(supabase as never, 'user-1')

    expect(result.error).toBeNull()
    expect(result.deletedCount).toBe(0)
  })
})
