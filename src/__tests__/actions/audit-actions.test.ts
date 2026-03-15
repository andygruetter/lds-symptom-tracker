import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetUser = vi.fn()
const mockGetAuditLogForPatient = vi.fn()

vi.mock('@/lib/db/client', () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}))

vi.mock('@/lib/db/audit', () => ({
  getAuditLogForPatient: mockGetAuditLogForPatient,
  insertAuditEntry: vi.fn(),
  trackSharingAccess: vi.fn(),
  trackSharingAccessFromPage: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('loadAuditLog', () => {
  it('gibt AUTH_REQUIRED zurück wenn nicht angemeldet', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { loadAuditLog } = await import('@/lib/actions/audit-actions')
    const result = await loadAuditLog()

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('AUTH_REQUIRED')
  })

  it('gibt Audit-Einträge für angemeldeten User zurück', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const mockEntries = [
      {
        id: 'audit-1',
        action: 'dashboard_view' as const,
        accessedAt: '2026-03-15T10:00:00Z',
        sharingLinkId: 'link-1',
        sharingLinkPeriod: '01.02. – 15.03.2026',
      },
    ]
    mockGetAuditLogForPatient.mockResolvedValue(mockEntries)

    const { loadAuditLog } = await import('@/lib/actions/audit-actions')
    const result = await loadAuditLog()

    expect(result.error).toBeNull()
    expect(result.data).toHaveLength(1)
    expect(result.data![0].action).toBe('dashboard_view')
    expect(mockGetAuditLogForPatient).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
    )
  })

  it('gibt leere Liste zurück wenn keine Einträge vorhanden', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-2' } } })
    mockGetAuditLogForPatient.mockResolvedValue([])

    const { loadAuditLog } = await import('@/lib/actions/audit-actions')
    const result = await loadAuditLog()

    expect(result.error).toBeNull()
    expect(result.data).toEqual([])
  })

  it('gibt AUDIT_LOAD_FAILED zurück bei DB-Fehler', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-3' } } })
    mockGetAuditLogForPatient.mockRejectedValue(new Error('connection refused'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { loadAuditLog } = await import('@/lib/actions/audit-actions')
    const result = await loadAuditLog()

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('AUDIT_LOAD_FAILED')
    consoleSpy.mockRestore()
  })
})
