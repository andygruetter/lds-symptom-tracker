import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock crypto utility
const mockHashIpAddress = vi.fn((ip: string) => `hash-of-${ip}`)
vi.mock('@/lib/utils/crypto', () => ({
  generateSharingToken: vi.fn(),
  hashIpAddress: mockHashIpAddress,
}))

// Mock createServiceClient
const mockServiceFrom = vi.fn()
vi.mock('@/lib/db/client', () => ({
  createServiceClient: vi.fn(() => ({ from: mockServiceFrom })),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

// Helper: erstellt einen Mock-Supabase-Client für insertAuditEntry
function createInsertMock(result: { data: unknown; error: unknown }) {
  const insertBuilder = {
    insert: vi.fn().mockResolvedValue(result),
  }
  return {
    from: vi.fn().mockReturnValue(insertBuilder),
    _insertBuilder: insertBuilder,
  }
}

// Helper: erstellt einen Mock-Supabase-Client für getAuditLogForPatient
function createSelectMock(result: { data: unknown; error: unknown }) {
  const selectBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue(result),
  }
  return {
    from: vi.fn().mockReturnValue(selectBuilder),
    _selectBuilder: selectBuilder,
  }
}

describe('insertAuditEntry', () => {
  it('schreibt einen Audit-Eintrag in die DB', async () => {
    const supabase = createInsertMock({ data: null, error: null })

    const { insertAuditEntry } = await import('@/lib/db/audit')
    await insertAuditEntry(supabase as never, {
      accountId: 'user-1',
      sharingLinkId: 'link-1',
      action: 'dashboard_view',
      ipAddressHash: 'abc123',
    })

    expect(supabase.from).toHaveBeenCalledWith('audit_log')
    expect(supabase._insertBuilder.insert).toHaveBeenCalledWith({
      account_id: 'user-1',
      sharing_link_id: 'link-1',
      action: 'dashboard_view',
      ip_address_hash: 'abc123',
      metadata: null,
    })
  })

  it('loggt Fehler aber wirft nicht (best-effort)', async () => {
    const supabase = createInsertMock({
      data: null,
      error: { message: 'RLS blockiert Insert' },
    })
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { insertAuditEntry } = await import('@/lib/db/audit')
    await expect(
      insertAuditEntry(supabase as never, {
        accountId: 'user-1',
        sharingLinkId: 'link-1',
        action: 'event_detail',
      }),
    ).resolves.toBeUndefined()

    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('setzt ip_address_hash und metadata auf null wenn nicht übergeben', async () => {
    const supabase = createInsertMock({ data: null, error: null })

    const { insertAuditEntry } = await import('@/lib/db/audit')
    await insertAuditEntry(supabase as never, {
      accountId: 'user-2',
      sharingLinkId: 'link-2',
      action: 'photo_view',
    })

    expect(supabase._insertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        ip_address_hash: null,
        metadata: null,
      }),
    )
  })

  it('speichert metadata korrekt', async () => {
    const supabase = createInsertMock({ data: null, error: null })
    const meta = { eventId: 'event-123' }

    const { insertAuditEntry } = await import('@/lib/db/audit')
    await insertAuditEntry(supabase as never, {
      accountId: 'user-1',
      sharingLinkId: 'link-1',
      action: 'audio_stream',
      metadata: meta,
    })

    expect(supabase._insertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: meta }),
    )
  })
})

describe('getAuditLogForPatient', () => {
  it('gibt Audit-Einträge mit Sharing-Link-Referenz zurück', async () => {
    const mockData = [
      {
        id: 'audit-1',
        action: 'dashboard_view',
        accessed_at: '2026-03-15T10:00:00Z',
        sharing_link_id: 'link-1',
        sharing_links: { date_from: '2026-02-01', date_to: '2026-03-15' },
      },
      {
        id: 'audit-2',
        action: 'event_detail',
        accessed_at: '2026-03-14T09:00:00Z',
        sharing_link_id: 'link-1',
        sharing_links: { date_from: '2026-02-01', date_to: '2026-03-15' },
      },
    ]
    const supabase = createSelectMock({ data: mockData, error: null })

    const { getAuditLogForPatient } = await import('@/lib/db/audit')
    const result = await getAuditLogForPatient(supabase as never, 'user-1')

    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('audit-1')
    expect(result[0].action).toBe('dashboard_view')
    expect(result[0].accessedAt).toBe('2026-03-15T10:00:00Z')
    expect(result[0].sharingLinkPeriod).toContain('2026')
    expect(supabase.from).toHaveBeenCalledWith('audit_log')
  })

  it('sortiert nach accessed_at DESC', async () => {
    const supabase = createSelectMock({ data: [], error: null })

    const { getAuditLogForPatient } = await import('@/lib/db/audit')
    await getAuditLogForPatient(supabase as never, 'user-1')

    expect(supabase._selectBuilder.order).toHaveBeenCalledWith('accessed_at', {
      ascending: false,
    })
  })

  it('filtert nach account_id (RLS + App-Level)', async () => {
    const supabase = createSelectMock({ data: [], error: null })

    const { getAuditLogForPatient } = await import('@/lib/db/audit')
    await getAuditLogForPatient(supabase as never, 'user-abc')

    expect(supabase._selectBuilder.eq).toHaveBeenCalledWith(
      'account_id',
      'user-abc',
    )
  })

  it('wirft bei DB-Fehler (statt falsches leeres Array)', async () => {
    const supabase = createSelectMock({
      data: null,
      error: { message: 'DB Fehler' },
    })

    const { getAuditLogForPatient } = await import('@/lib/db/audit')
    await expect(
      getAuditLogForPatient(supabase as never, 'user-1'),
    ).rejects.toThrow('DB Fehler')
  })

  it('gibt leeres Array zurück wenn keine Einträge vorhanden', async () => {
    const supabase = createSelectMock({ data: [], error: null })

    const { getAuditLogForPatient } = await import('@/lib/db/audit')
    const result = await getAuditLogForPatient(supabase as never, 'user-1')

    expect(result).toEqual([])
  })
})

describe('trackSharingAccess', () => {
  it('extrahiert IP aus x-forwarded-for Header und hasht sie', async () => {
    const mockRequest = new Request('https://example.com', {
      headers: { 'x-forwarded-for': '203.0.113.1, 10.0.0.1' },
    })
    mockServiceFrom.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    })

    const { trackSharingAccess } = await import('@/lib/db/audit')
    await trackSharingAccess(
      mockRequest,
      { id: 'link-1', accountId: 'user-1' },
      'dashboard_view',
    )

    // IP-Adresse wurde extrahiert und gehasht
    expect(mockHashIpAddress).toHaveBeenCalledWith('203.0.113.1')
  })

  it('fällt auf x-real-ip zurück wenn kein x-forwarded-for vorhanden', async () => {
    const mockRequest = new Request('https://example.com', {
      headers: { 'x-real-ip': '198.51.100.1' },
    })
    mockServiceFrom.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    })

    const { trackSharingAccess } = await import('@/lib/db/audit')
    await trackSharingAccess(
      mockRequest,
      { id: 'link-1', accountId: 'user-1' },
      'event_detail',
    )

    expect(mockHashIpAddress).toHaveBeenCalledWith('198.51.100.1')
  })

  it('verwendet "unknown" wenn keine IP-Header gesetzt sind', async () => {
    const mockRequest = new Request('https://example.com')
    mockServiceFrom.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    })

    const { trackSharingAccess } = await import('@/lib/db/audit')
    await trackSharingAccess(
      mockRequest,
      { id: 'link-1', accountId: 'user-1' },
      'audio_stream',
    )

    expect(mockHashIpAddress).toHaveBeenCalledWith('unknown')
  })

  it('wirft nicht bei DB-Fehler (best-effort)', async () => {
    const mockRequest = new Request('https://example.com')
    mockServiceFrom.mockReturnValue({
      insert: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'DB Fehler' },
      }),
    })
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { trackSharingAccess } = await import('@/lib/db/audit')
    await expect(
      trackSharingAccess(
        mockRequest,
        { id: 'link-1', accountId: 'user-1' },
        'photo_view',
      ),
    ).resolves.toBeUndefined()

    consoleSpy.mockRestore()
  })

  it('verwendet Service Client (nicht Server Client)', async () => {
    const { createServiceClient } = await import('@/lib/db/client')
    const mockRequest = new Request('https://example.com')
    mockServiceFrom.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    })

    const { trackSharingAccess } = await import('@/lib/db/audit')
    await trackSharingAccess(
      mockRequest,
      { id: 'link-1', accountId: 'user-1' },
      'dashboard_view',
    )

    expect(createServiceClient).toHaveBeenCalled()
  })
})
