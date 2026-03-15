import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock crypto utility
const mockGenerateSharingToken = vi.fn()
vi.mock('@/lib/utils/crypto', () => ({
  generateSharingToken: mockGenerateSharingToken,
}))

// Mock date utility
vi.mock('@/lib/utils/date', () => ({
  toLocalDateKey: (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  },
}))

// Mock createServiceClient für validateSharingToken / validateSharingLinkById / getSharedSymptomEvents
const mockServiceFrom = vi.fn()
vi.mock('@/lib/db/client', () => ({
  createServiceClient: vi.fn(() => ({
    from: mockServiceFrom,
  })),
}))

// Mock process.env
const originalEnv = process.env.NEXT_PUBLIC_APP_URL

beforeEach(() => {
  vi.clearAllMocks()
  process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com'
  mockGenerateSharingToken.mockReturnValue('a'.repeat(64))
})

afterEach(() => {
  process.env.NEXT_PUBLIC_APP_URL = originalEnv
})

function createMockSupabase(insertResult = { data: null, error: null }) {
  const insertBuilder = {
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(insertResult),
  }
  const builder = {
    insert: vi.fn().mockReturnValue(insertBuilder),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: [], error: null }),
    update: vi.fn().mockReturnThis(),
    _insertBuilder: insertBuilder,
  }
  return {
    from: vi.fn().mockReturnValue(builder),
    _builder: builder,
  }
}

describe('createSharingLink', () => {
  it('erstellt einen Sharing-Link und gibt ihn zurück', async () => {
    const mockRow = {
      id: 'link-id-1',
      account_id: 'user-1',
      token: 'a'.repeat(64),
      date_from: '2026-02-13',
      date_to: '2026-03-15',
      expires_at: '2099-01-01T00:00:00.000Z',
      recipient_email: null,
      revoked_at: null,
      created_at: '2026-03-15T10:00:00.000Z',
    }
    const supabase = createMockSupabase({ data: mockRow, error: null })

    const { createSharingLink } = await import('@/lib/db/sharing')
    const result = await createSharingLink(supabase as never, 'user-1', {
      dateRange: '1m',
      accessDuration: '24h',
    })

    expect(result.error).toBeNull()
    expect(result.data).not.toBeNull()
    expect(result.data?.token).toBe('a'.repeat(64))
    expect(result.data?.shareUrl).toBe(
      `https://app.example.com/share/${'a'.repeat(64)}`,
    )
    expect(result.data?.isActive).toBe(true)
  })

  it('gibt TOKEN_ERROR zurück wenn generateSharingToken wirft', async () => {
    mockGenerateSharingToken.mockImplementation(() => {
      throw new Error('SHARING_HMAC_SECRET ist nicht konfiguriert')
    })
    const supabase = createMockSupabase()

    const { createSharingLink } = await import('@/lib/db/sharing')
    const result = await createSharingLink(supabase as never, 'user-1', {
      dateRange: '3m',
      accessDuration: '48h',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('TOKEN_ERROR')
  })

  it('gibt DB_ERROR zurück bei DB-Fehler', async () => {
    const supabase = createMockSupabase({
      data: null,
      error: { message: 'DB Verbindungsfehler', code: '08006' } as never,
    })

    const { createSharingLink } = await import('@/lib/db/sharing')
    const result = await createSharingLink(supabase as never, 'user-1', {
      dateRange: '6m',
      accessDuration: '7d',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })

  it('wiederholt bei UNIQUE-Constraint-Verletzung (Token-Kollision)', async () => {
    // Erste 2 Versuche scheitern mit UNIQUE-Fehler, dritter Versuch erfolgreich
    const mockRow = {
      id: 'link-id-1',
      account_id: 'user-1',
      token: 'b'.repeat(64),
      date_from: '2025-03-15',
      date_to: '2026-03-15',
      expires_at: '2099-01-01T00:00:00.000Z',
      recipient_email: null,
      revoked_at: null,
      created_at: '2026-03-15T10:00:00.000Z',
    }

    const insertBuilder = {
      select: vi.fn().mockReturnThis(),
      single: vi
        .fn()
        .mockResolvedValueOnce({
          data: null,
          error: { code: '23505', message: 'unique violation' },
        })
        .mockResolvedValueOnce({
          data: null,
          error: { code: '23505', message: 'unique violation' },
        })
        .mockResolvedValueOnce({ data: mockRow, error: null }),
    }
    const builder = {
      insert: vi.fn().mockReturnValue(insertBuilder),
    }
    const supabase = { from: vi.fn().mockReturnValue(builder) }

    mockGenerateSharingToken
      .mockReturnValueOnce('c'.repeat(64))
      .mockReturnValueOnce('c'.repeat(64))
      .mockReturnValueOnce('b'.repeat(64))

    const { createSharingLink } = await import('@/lib/db/sharing')
    const result = await createSharingLink(supabase as never, 'user-1', {
      dateRange: '12m',
      accessDuration: '24h',
    })

    expect(result.error).toBeNull()
    expect(result.data?.token).toBe('b'.repeat(64))
    expect(insertBuilder.single).toHaveBeenCalledTimes(3)
  })

  it('verwendet customFrom/customTo für individuellen Zeitraum', async () => {
    const mockRow = {
      id: 'link-id-1',
      account_id: 'user-1',
      token: 'a'.repeat(64),
      date_from: '2026-01-01',
      date_to: '2026-03-01',
      expires_at: '2099-01-01T00:00:00.000Z',
      recipient_email: null,
      revoked_at: null,
      created_at: '2026-03-15T10:00:00.000Z',
    }
    const supabase = createMockSupabase({ data: mockRow, error: null })

    const { createSharingLink } = await import('@/lib/db/sharing')
    const result = await createSharingLink(supabase as never, 'user-1', {
      dateRange: 'custom',
      accessDuration: '7d',
      customFrom: '2026-01-01',
      customTo: '2026-03-01',
    })

    expect(result.error).toBeNull()
    expect(supabase._builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        date_from: '2026-01-01',
        date_to: '2026-03-01',
      }),
    )
  })
})

describe('getActiveSharingLinks', () => {
  it('gibt leere Liste zurück wenn keine aktiven Links vorhanden', async () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    const supabase = { from: vi.fn().mockReturnValue(builder) }

    const { getActiveSharingLinks } = await import('@/lib/db/sharing')
    const result = await getActiveSharingLinks(supabase as never, 'user-1')

    expect(result.error).toBeNull()
    expect(result.data).toEqual([])
  })

  it('gibt aktive Links als SharingLinkListItem zurück', async () => {
    const mockRows = [
      {
        id: 'link-1',
        account_id: 'user-1',
        token: 'd'.repeat(64),
        date_from: '2026-02-15',
        date_to: '2026-03-15',
        expires_at: '2099-01-01T00:00:00.000Z',
        recipient_email: null,
        revoked_at: null,
        created_at: '2026-03-15T10:00:00.000Z',
      },
    ]
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockRows, error: null }),
    }
    const supabase = { from: vi.fn().mockReturnValue(builder) }

    const { getActiveSharingLinks } = await import('@/lib/db/sharing')
    const result = await getActiveSharingLinks(supabase as never, 'user-1')

    expect(result.error).toBeNull()
    expect(result.data).toHaveLength(1)
    expect(result.data![0].id).toBe('link-1')
    expect(result.data![0].isActive).toBe(true)
    expect(result.data![0].shareUrl).toBe(
      `https://app.example.com/share/${'d'.repeat(64)}`,
    )
  })

  it('gibt DB_ERROR zurück bei DB-Fehler', async () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'DB error' } }),
    }
    const supabase = { from: vi.fn().mockReturnValue(builder) }

    const { getActiveSharingLinks } = await import('@/lib/db/sharing')
    const result = await getActiveSharingLinks(supabase as never, 'user-1')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })
})

describe('revokeSharingLink', () => {
  it('revoziert einen Sharing-Link erfolgreich', async () => {
    const builder = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      select: vi
        .fn()
        .mockResolvedValue({ data: [{ id: 'link-1' }], error: null }),
    }
    const supabase = { from: vi.fn().mockReturnValue(builder) }

    const { revokeSharingLink } = await import('@/lib/db/sharing')
    const result = await revokeSharingLink(
      supabase as never,
      'user-1',
      'link-1',
    )

    expect(result.error).toBeNull()
    expect(result.data).toBeNull()
    expect(builder.is).toHaveBeenCalledWith('revoked_at', null)
  })

  it('gibt LINK_NOT_ACTIVE zurück wenn Link bereits widerrufen', async () => {
    const builder = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    const supabase = { from: vi.fn().mockReturnValue(builder) }

    const { revokeSharingLink } = await import('@/lib/db/sharing')
    const result = await revokeSharingLink(
      supabase as never,
      'user-1',
      'link-1',
    )

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('LINK_NOT_ACTIVE')
  })
})

describe('computeLinkStatus', () => {
  it('gibt "active" zurück wenn Link nicht abgelaufen und nicht widerrufen', async () => {
    const { computeLinkStatus } = await import('@/lib/db/sharing')
    expect(computeLinkStatus('2099-01-01T00:00:00.000Z', null)).toBe('active')
  })

  it('gibt "expired" zurück wenn expires_at in der Vergangenheit liegt', async () => {
    const { computeLinkStatus } = await import('@/lib/db/sharing')
    expect(computeLinkStatus('2020-01-01T00:00:00.000Z', null)).toBe('expired')
  })

  it('gibt "revoked" zurück wenn revoked_at gesetzt ist (auch wenn noch nicht abgelaufen)', async () => {
    const { computeLinkStatus } = await import('@/lib/db/sharing')
    expect(
      computeLinkStatus('2099-01-01T00:00:00.000Z', '2026-03-10T08:00:00.000Z'),
    ).toBe('revoked')
  })

  it('gibt "revoked" zurück wenn sowohl abgelaufen als auch widerrufen', async () => {
    const { computeLinkStatus } = await import('@/lib/db/sharing')
    expect(
      computeLinkStatus('2020-01-01T00:00:00.000Z', '2019-12-01T00:00:00.000Z'),
    ).toBe('revoked')
  })
})

describe('getAllSharingLinks', () => {
  it('gibt alle Links zurück (aktiv + abgelaufen + widerrufen)', async () => {
    const mockRows = [
      {
        id: 'link-active',
        account_id: 'user-1',
        token: 'a'.repeat(64),
        date_from: '2026-02-15',
        date_to: '2026-03-15',
        expires_at: '2099-01-01T00:00:00.000Z',
        recipient_email: null,
        revoked_at: null,
        created_at: '2026-03-15T10:00:00.000Z',
      },
      {
        id: 'link-expired',
        account_id: 'user-1',
        token: 'b'.repeat(64),
        date_from: '2025-01-01',
        date_to: '2025-02-01',
        expires_at: '2025-02-08T00:00:00.000Z',
        recipient_email: null,
        revoked_at: null,
        created_at: '2025-01-01T10:00:00.000Z',
      },
      {
        id: 'link-revoked',
        account_id: 'user-1',
        token: 'c'.repeat(64),
        date_from: '2025-10-01',
        date_to: '2026-01-01',
        expires_at: '2099-01-01T00:00:00.000Z',
        recipient_email: null,
        revoked_at: '2026-01-17T12:00:00.000Z',
        created_at: '2025-10-01T10:00:00.000Z',
      },
    ]
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockRows, error: null }),
    }
    const supabase = { from: vi.fn().mockReturnValue(builder) }

    const { getAllSharingLinks } = await import('@/lib/db/sharing')
    const result = await getAllSharingLinks(supabase as never, 'user-1')

    expect(result.error).toBeNull()
    expect(result.data).toHaveLength(3)
    expect(result.data![0].status).toBe('active')
    expect(result.data![1].status).toBe('expired')
    expect(result.data![2].status).toBe('revoked')
    expect(result.data![2].revokedAt).toBe('2026-01-17T12:00:00.000Z')
  })

  it('gibt leere Liste zurück wenn keine Links vorhanden', async () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    const supabase = { from: vi.fn().mockReturnValue(builder) }

    const { getAllSharingLinks } = await import('@/lib/db/sharing')
    const result = await getAllSharingLinks(supabase as never, 'user-1')

    expect(result.error).toBeNull()
    expect(result.data).toEqual([])
  })

  it('gibt DB_ERROR zurück bei DB-Fehler', async () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'DB error' } }),
    }
    const supabase = { from: vi.fn().mockReturnValue(builder) }

    const { getAllSharingLinks } = await import('@/lib/db/sharing')
    const result = await getAllSharingLinks(supabase as never, 'user-1')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
  })
})

// Helper: erstellt einen Mock-Builder für Service-Client-Queries (.select.eq.gt.is.single)
function createServiceQueryBuilder(singleResult: {
  data: unknown
  error: unknown
}) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: [], error: null }),
    single: vi.fn().mockResolvedValue(singleResult),
  }
  return builder
}

describe('validateSharingToken', () => {
  it('gibt SharingLinkData zurück bei gültigem Token', async () => {
    const mockRow = {
      id: 'link-uuid-1',
      account_id: 'user-1',
      date_from: '2026-01-01',
      date_to: '2026-03-15',
      expires_at: '2099-01-01T00:00:00.000Z',
    }
    const builder = createServiceQueryBuilder({ data: mockRow, error: null })
    mockServiceFrom.mockReturnValue(builder)

    const { validateSharingToken } = await import('@/lib/db/sharing')
    const result = await validateSharingToken('a'.repeat(64))

    expect(result).not.toBeNull()
    expect(result?.id).toBe('link-uuid-1')
    expect(result?.accountId).toBe('user-1')
    expect(result?.dateFrom).toBe('2026-01-01')
    expect(result?.dateTo).toBe('2026-03-15')
    expect(result?.expiresAt).toBe('2099-01-01T00:00:00.000Z')
    expect(builder.eq).toHaveBeenCalledWith('token', 'a'.repeat(64))
    expect(builder.is).toHaveBeenCalledWith('revoked_at', null)
  })

  it('gibt null zurück bei nicht-existierendem Token', async () => {
    const builder = createServiceQueryBuilder({
      data: null,
      error: { message: 'PGRST116', code: 'PGRST116' },
    })
    mockServiceFrom.mockReturnValue(builder)

    const { validateSharingToken } = await import('@/lib/db/sharing')
    const result = await validateSharingToken('nicht-existent')

    expect(result).toBeNull()
  })

  it('gibt null zurück bei abgelaufenem Token (DB-Filter)', async () => {
    // DB gibt null zurück weil expires_at > NOW() Filter greift
    const builder = createServiceQueryBuilder({
      data: null,
      error: { message: 'no rows', code: 'PGRST116' },
    })
    mockServiceFrom.mockReturnValue(builder)

    const { validateSharingToken } = await import('@/lib/db/sharing')
    const result = await validateSharingToken('expired-token')

    expect(result).toBeNull()
    // Sicherstellen dass der Ablauf-Filter gesetzt wird
    expect(builder.gt).toHaveBeenCalledWith('expires_at', expect.any(String))
  })

  it('gibt null zurück bei widerrufenen Token (revoked_at IS NOT NULL)', async () => {
    const builder = createServiceQueryBuilder({
      data: null,
      error: { message: 'no rows', code: 'PGRST116' },
    })
    mockServiceFrom.mockReturnValue(builder)

    const { validateSharingToken } = await import('@/lib/db/sharing')
    const result = await validateSharingToken('revoked-token')

    expect(result).toBeNull()
    expect(builder.is).toHaveBeenCalledWith('revoked_at', null)
  })
})

describe('validateSharingLinkById', () => {
  it('gibt SharingLinkData zurück bei gültiger Link-ID', async () => {
    const mockRow = {
      id: 'link-uuid-2',
      account_id: 'user-2',
      date_from: '2026-02-01',
      date_to: '2026-03-01',
      expires_at: '2099-06-01T00:00:00.000Z',
    }
    const builder = createServiceQueryBuilder({ data: mockRow, error: null })
    mockServiceFrom.mockReturnValue(builder)

    const { validateSharingLinkById } = await import('@/lib/db/sharing')
    const result = await validateSharingLinkById('link-uuid-2')

    expect(result).not.toBeNull()
    expect(result?.id).toBe('link-uuid-2')
    expect(result?.accountId).toBe('user-2')
    expect(builder.eq).toHaveBeenCalledWith('id', 'link-uuid-2')
  })

  it('gibt null zurück bei nicht-existierender Link-ID', async () => {
    const builder = createServiceQueryBuilder({
      data: null,
      error: { code: 'PGRST116', message: 'no rows' },
    })
    mockServiceFrom.mockReturnValue(builder)

    const { validateSharingLinkById } = await import('@/lib/db/sharing')
    const result = await validateSharingLinkById('unknown-id')

    expect(result).toBeNull()
  })
})

describe('getSharedSymptomEvents', () => {
  it('gibt Events innerhalb des Zeitraums zurück', async () => {
    const mockRows = [
      {
        id: 'event-1',
        event_type: 'symptom',
        occurred_at: '2026-02-10T10:00:00Z',
        ended_at: null,
        raw_input: 'Kopfschmerzen',
        audio_url: null,
        status: 'confirmed',
      },
      {
        id: 'event-2',
        event_type: 'symptom',
        occurred_at: '2026-01-15T09:00:00Z',
        ended_at: '2026-01-15T10:00:00Z',
        raw_input: 'Schwindel',
        audio_url: 'path/to/audio.webm',
        status: 'confirmed',
      },
    ]
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockRows, error: null }),
    }
    mockServiceFrom.mockReturnValue(builder)

    const { getSharedSymptomEvents } = await import('@/lib/db/sharing')
    const result = await getSharedSymptomEvents(
      'user-1',
      '2026-01-01',
      '2026-03-15',
    )

    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('event-1')
    expect(result[0].eventType).toBe('symptom')
    expect(result[1].audioUrl).toBe('path/to/audio.webm')
    expect(builder.eq).toHaveBeenCalledWith('account_id', 'user-1')
    expect(builder.gte).toHaveBeenCalledWith('occurred_at', '2026-01-01')
    expect(builder.lte).toHaveBeenCalledWith('occurred_at', '2026-03-15')
    expect(builder.is).toHaveBeenCalledWith('deleted_at', null)
  })

  it('filtert Events mit deleted_at (Soft-Delete)', async () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    mockServiceFrom.mockReturnValue(builder)

    const { getSharedSymptomEvents } = await import('@/lib/db/sharing')
    const result = await getSharedSymptomEvents(
      'user-1',
      '2026-01-01',
      '2026-03-15',
    )

    expect(result).toEqual([])
    expect(builder.is).toHaveBeenCalledWith('deleted_at', null)
  })

  it('gibt leeres Array zurück bei DB-Fehler', async () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'DB error' } }),
    }
    mockServiceFrom.mockReturnValue(builder)

    const { getSharedSymptomEvents } = await import('@/lib/db/sharing')
    const result = await getSharedSymptomEvents(
      'user-1',
      '2026-01-01',
      '2026-03-15',
    )

    expect(result).toEqual([])
  })

  it('verwendet Service Client (account_id Filter vorhanden)', async () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    mockServiceFrom.mockReturnValue(builder)

    const { getSharedSymptomEvents } = await import('@/lib/db/sharing')
    await getSharedSymptomEvents('account-xyz', '2026-01-01', '2026-12-31')

    expect(mockServiceFrom).toHaveBeenCalledWith('symptom_events')
    expect(builder.eq).toHaveBeenCalledWith('account_id', 'account-xyz')
  })
})

describe('getSharedEventsForSummary', () => {
  it('gibt Events mit extrahierten Feldern zurück', async () => {
    const mockData = [
      {
        id: 'evt-1',
        event_type: 'symptom',
        occurred_at: '2026-03-01T08:00:00Z',
        ended_at: null,
        raw_input: 'Kopfschmerzen rechts',
        extracted_data: [
          {
            field_name: 'symptom_name',
            value: 'Kopfschmerzen',
            confidence: 95,
          },
          { field_name: 'body_region', value: 'Kopf', confidence: 90 },
        ],
      },
    ]
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    }
    mockServiceFrom.mockReturnValue(builder)

    const { getSharedEventsForSummary } = await import('@/lib/db/sharing')
    const result = await getSharedEventsForSummary(
      'user-1',
      '2026-03-01',
      '2026-03-15',
    )

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('evt-1')
    expect(result[0].eventType).toBe('symptom')
    expect(result[0].extractedFields).toHaveLength(2)
    expect(result[0].extractedFields[0].fieldName).toBe('symptom_name')
    expect(result[0].extractedFields[0].value).toBe('Kopfschmerzen')
    // Sortierung ASC für Summary-Kontext
    expect(builder.order).toHaveBeenCalledWith('occurred_at', {
      ascending: true,
    })
  })

  it('gibt Events ohne extracted_data korrekt zurück (leeres Array)', async () => {
    const mockData = [
      {
        id: 'evt-2',
        event_type: 'symptom',
        occurred_at: '2026-03-02T10:00:00Z',
        ended_at: null,
        raw_input: 'Schwindel',
        extracted_data: [],
      },
    ]
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    }
    mockServiceFrom.mockReturnValue(builder)

    const { getSharedEventsForSummary } = await import('@/lib/db/sharing')
    const result = await getSharedEventsForSummary(
      'user-1',
      '2026-03-01',
      '2026-03-15',
    )

    expect(result[0].extractedFields).toEqual([])
  })

  it('gibt leeres Array zurück bei DB-Fehler', async () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'DB error' } }),
    }
    mockServiceFrom.mockReturnValue(builder)

    const { getSharedEventsForSummary } = await import('@/lib/db/sharing')
    const result = await getSharedEventsForSummary(
      'user-1',
      '2026-03-01',
      '2026-03-15',
    )

    expect(result).toEqual([])
  })
})

describe('getSharedSymptomRanking', () => {
  function createRankingBuilder(rows: unknown[], error: unknown = null) {
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: rows, error }),
    }
    return builder
  }

  it('gibt leeres Ranking zurück wenn keine Events vorhanden', async () => {
    const builder = createRankingBuilder([])
    mockServiceFrom.mockReturnValue(builder)

    const { getSharedSymptomRanking } = await import('@/lib/db/sharing')
    const result = await getSharedSymptomRanking(
      'user-1',
      '2026-01-01',
      '2026-03-15',
    )

    expect(result.symptoms).toEqual([])
    expect(result.medications).toEqual([])
    expect(result.totalSymptomEvents).toBe(0)
    expect(result.totalMedicationEvents).toBe(0)
    expect(result.timeRange).toBe('all')
  })

  it('gibt leeres Ranking zurück bei DB-Fehler', async () => {
    const builder = createRankingBuilder(null as never, { message: 'DB error' })
    mockServiceFrom.mockReturnValue(builder)

    const { getSharedSymptomRanking } = await import('@/lib/db/sharing')
    const result = await getSharedSymptomRanking(
      'user-1',
      '2026-01-01',
      '2026-03-15',
    )

    expect(result.symptoms).toEqual([])
    expect(result.medications).toEqual([])
  })

  it('trennt Symptome und Medikamente korrekt', async () => {
    const mockRows = [
      {
        id: 'e1',
        event_type: 'symptom',
        occurred_at: '2026-02-10T10:00:00Z',
        extracted_data: [
          { field_name: 'symptom_name', value: 'Kopfschmerzen' },
          { field_name: 'intensity', value: '7' },
        ],
      },
      {
        id: 'e2',
        event_type: 'symptom',
        occurred_at: '2026-02-15T09:00:00Z',
        extracted_data: [
          { field_name: 'symptom_name', value: 'Kopfschmerzen' },
          { field_name: 'intensity', value: '5' },
        ],
      },
      {
        id: 'e3',
        event_type: 'medication',
        occurred_at: '2026-02-20T08:00:00Z',
        extracted_data: [
          { field_name: 'medication', value: 'Ibuprofen 400mg' },
        ],
      },
    ]
    const builder = createRankingBuilder(mockRows)
    mockServiceFrom.mockReturnValue(builder)

    const { getSharedSymptomRanking } = await import('@/lib/db/sharing')
    const result = await getSharedSymptomRanking(
      'user-1',
      '2026-02-01',
      '2026-03-15',
    )

    expect(result.symptoms).toHaveLength(1)
    expect(result.symptoms[0].name).toBe('Kopfschmerzen')
    expect(result.symptoms[0].totalCount).toBe(2)
    expect(result.symptoms[0].avgIntensity).toBeCloseTo(6.0)

    expect(result.medications).toHaveLength(1)
    expect(result.medications[0].name).toBe('Ibuprofen 400mg')
    expect(result.medications[0].totalCount).toBe(1)

    expect(result.totalSymptomEvents).toBe(2)
    expect(result.totalMedicationEvents).toBe(1)
  })

  it('sortiert nach totalCount absteigend, dann alphabetisch', async () => {
    const mockRows = [
      {
        id: 'e1',
        event_type: 'symptom',
        occurred_at: '2026-02-10T10:00:00Z',
        extracted_data: [{ field_name: 'symptom_name', value: 'Rücken' }],
      },
      {
        id: 'e2',
        event_type: 'symptom',
        occurred_at: '2026-02-11T10:00:00Z',
        extracted_data: [{ field_name: 'symptom_name', value: 'Rücken' }],
      },
      {
        id: 'e3',
        event_type: 'symptom',
        occurred_at: '2026-02-12T10:00:00Z',
        extracted_data: [{ field_name: 'symptom_name', value: 'Rücken' }],
      },
      {
        id: 'e4',
        event_type: 'symptom',
        occurred_at: '2026-02-13T10:00:00Z',
        extracted_data: [{ field_name: 'symptom_name', value: 'Kopf' }],
      },
    ]
    const builder = createRankingBuilder(mockRows)
    mockServiceFrom.mockReturnValue(builder)

    const { getSharedSymptomRanking } = await import('@/lib/db/sharing')
    const result = await getSharedSymptomRanking(
      'user-1',
      '2026-02-01',
      '2026-03-15',
    )

    expect(result.symptoms[0].name).toBe('Rücken')
    expect(result.symptoms[0].totalCount).toBe(3)
    expect(result.symptoms[1].name).toBe('Kopf')
    expect(result.symptoms[1].totalCount).toBe(1)
  })

  it('verwirft Events ausserhalb des Zeitraums (Timezone-Edge-Case)', async () => {
    // Events am Puffer-Tag (1 Tag vor dateFrom) sollen NICHT gezählt werden
    const mockRows = [
      {
        id: 'e1',
        event_type: 'symptom',
        // Puffer-Event: occurred_at am Tag vor dateFrom (2026-01-31)
        occurred_at: '2026-01-31T23:00:00Z',
        extracted_data: [{ field_name: 'symptom_name', value: 'Puffer-Event' }],
      },
      {
        id: 'e2',
        event_type: 'symptom',
        // Valides Event: am ersten Tag des Zeitraums
        occurred_at: '2026-02-01T10:00:00Z',
        extracted_data: [
          { field_name: 'symptom_name', value: 'Kopfschmerzen' },
        ],
      },
    ]
    const builder = createRankingBuilder(mockRows)
    mockServiceFrom.mockReturnValue(builder)

    const { getSharedSymptomRanking } = await import('@/lib/db/sharing')
    const result = await getSharedSymptomRanking(
      'user-1',
      '2026-02-01',
      '2026-03-15',
    )

    // Nur das valide Event soll gezählt werden
    const names = result.symptoms.map((s) => s.name)
    expect(names).not.toContain('Puffer-Event')
    expect(names).toContain('Kopfschmerzen')
    // Zeitraum-Filter prüfen: gte und lt werden mit ISO-Strings aufgerufen
    expect(builder.gte).toHaveBeenCalledWith('occurred_at', expect.any(String))
    expect(builder.lt).toHaveBeenCalledWith('occurred_at', expect.any(String))
  })

  it('sammelt Events ohne symptom_name in Unbekannt-Gruppe', async () => {
    const mockRows = [
      {
        id: 'e1',
        event_type: 'symptom',
        occurred_at: '2026-02-10T10:00:00Z',
        extracted_data: [], // kein symptom_name
      },
    ]
    const builder = createRankingBuilder(mockRows)
    mockServiceFrom.mockReturnValue(builder)

    const { getSharedSymptomRanking } = await import('@/lib/db/sharing')
    const result = await getSharedSymptomRanking(
      'user-1',
      '2026-02-01',
      '2026-03-15',
    )

    expect(result.symptoms).toHaveLength(1)
    expect(result.symptoms[0].name).toBe('Unbekannt')
    expect(result.symptoms[0].totalCount).toBe(1)
  })
})
