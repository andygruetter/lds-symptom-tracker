/**
 * Tests für audit_log Zugriffskontrolle (Task 9).
 *
 * UNIT-TESTS: Prüfen das Anwendungsverhalten bei RLS-Fehlern und
 * die korrekte Verwendung von Service-Client vs. Server-Client.
 *
 * WICHTIG: Echte RLS-Policy-Validierung (INSERT-only, Patient-Isolation)
 * wird in E2E-Tests gegen die reale Datenbank geprüft.
 * Unit-Tests können RLS-Policies nicht verifizieren — sie testen hier
 * die Fehlerbehandlung der Anwendung, wenn RLS-Fehler auftreten.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock createServiceClient für audit.ts
const mockServiceInsert = vi.fn()
const mockServiceFrom = vi.fn(() => ({ insert: mockServiceInsert }))
vi.mock('@/lib/db/client', () => ({
  createServiceClient: vi.fn(() => ({ from: mockServiceFrom })),
}))

vi.mock('@/lib/utils/crypto', () => ({
  hashIpAddress: vi.fn((ip: string) => `hash-of-${ip}`),
  generateSharingToken: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('audit_log: Service-Client INSERT (AC#1, AC#2)', () => {
  it('insertAuditEntry schreibt über den übergebenen Client (Service-Client-Nutzung)', async () => {
    const insertFn = vi.fn().mockResolvedValue({ data: null, error: null })
    const supabase = { from: vi.fn().mockReturnValue({ insert: insertFn }) }

    const { insertAuditEntry } = await import('@/lib/db/audit')
    await insertAuditEntry(supabase as never, {
      accountId: 'patient-1',
      sharingLinkId: 'link-1',
      action: 'dashboard_view',
    })

    expect(supabase.from).toHaveBeenCalledWith('audit_log')
    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        account_id: 'patient-1',
        sharing_link_id: 'link-1',
        action: 'dashboard_view',
      }),
    )
  })

  it('insertAuditEntry behandelt RLS-Fehler graceful (loggt, wirft nicht)', async () => {
    const insertFn = vi.fn().mockResolvedValue({
      data: null,
      error: {
        code: '42501',
        message: 'new row violates row-level security policy',
      },
    })
    const supabase = { from: vi.fn().mockReturnValue({ insert: insertFn }) }
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { insertAuditEntry } = await import('@/lib/db/audit')
    await expect(
      insertAuditEntry(supabase as never, {
        accountId: 'patient-1',
        sharingLinkId: 'link-1',
        action: 'dashboard_view',
      }),
    ).resolves.toBeUndefined()

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[insertAuditEntry]'),
      expect.stringContaining('row-level security'),
    )
    consoleSpy.mockRestore()
  })

  it('trackSharingAccess nutzt createServiceClient (nicht Server-Client)', async () => {
    const { createServiceClient } = await import('@/lib/db/client')
    mockServiceInsert.mockResolvedValue({ data: null, error: null })

    const mockRequest = new Request('https://example.com', {
      headers: { 'x-forwarded-for': '1.2.3.4' },
    })

    const { trackSharingAccess } = await import('@/lib/db/audit')
    await trackSharingAccess(
      mockRequest,
      { id: 'link-1', accountId: 'patient-1' },
      'dashboard_view',
    )

    expect(createServiceClient).toHaveBeenCalled()
  })
})

describe('audit_log: Patient liest nur eigene Einträge (AC#2)', () => {
  it('getAuditLogForPatient filtert nach account_id (App-Level-Filter)', async () => {
    const selectBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    const supabase = { from: vi.fn().mockReturnValue(selectBuilder) }

    const { getAuditLogForPatient } = await import('@/lib/db/audit')
    await getAuditLogForPatient(supabase as never, 'patient-A')

    // App-Level-Filter stellt sicher dass nur eigene Einträge geladen werden
    expect(selectBuilder.eq).toHaveBeenCalledWith('account_id', 'patient-A')
  })

  it('getAuditLogForPatient gibt leeres Array bei fehlenden Einträgen (kein Fehler)', async () => {
    const selectBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    const supabase = { from: vi.fn().mockReturnValue(selectBuilder) }

    const { getAuditLogForPatient } = await import('@/lib/db/audit')
    const result = await getAuditLogForPatient(supabase as never, 'patient-B')

    expect(result).toEqual([])
  })

  it('getAuditLogForPatient wirft bei DB-Fehler (statt falsches leeres Array)', async () => {
    const selectBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'connection refused' },
      }),
    }
    const supabase = { from: vi.fn().mockReturnValue(selectBuilder) }

    const { getAuditLogForPatient } = await import('@/lib/db/audit')
    await expect(
      getAuditLogForPatient(supabase as never, 'patient-A'),
    ).rejects.toThrow('connection refused')
  })
})

describe('audit_log: IP wird gehasht gespeichert (AC#1, Task 9.5)', () => {
  it('IP-Adresse wird nicht im Klartext gespeichert', async () => {
    mockServiceInsert.mockResolvedValue({ data: null, error: null })

    const mockRequest = new Request('https://example.com', {
      headers: { 'x-forwarded-for': '203.0.113.42' },
    })

    const { trackSharingAccess } = await import('@/lib/db/audit')
    await trackSharingAccess(
      mockRequest,
      { id: 'link-1', accountId: 'user-1' },
      'dashboard_view',
    )

    const insertedData = mockServiceInsert.mock.calls[0]?.[0]
    expect(insertedData?.ip_address_hash).not.toBe('203.0.113.42')
    expect(insertedData?.ip_address_hash).toBe('hash-of-203.0.113.42')
  })
})

describe('audit_log: Eintrag bei Arzt-Zugriff (AC#1, Task 9.4)', () => {
  it('Audit-Entry enthält korrekte account_id, sharing_link_id und action', async () => {
    mockServiceInsert.mockResolvedValue({ data: null, error: null })

    const mockRequest = new Request('https://example.com', {
      headers: { 'x-forwarded-for': '1.2.3.4' },
    })
    const sharingLink = { id: 'link-uuid-1', accountId: 'patient-uuid-1' }

    const { trackSharingAccess } = await import('@/lib/db/audit')
    await trackSharingAccess(mockRequest, sharingLink, 'dashboard_view')

    expect(mockServiceInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        account_id: 'patient-uuid-1',
        sharing_link_id: 'link-uuid-1',
        action: 'dashboard_view',
      }),
    )
  })
})
