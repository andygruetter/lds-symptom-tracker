import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetUser = vi.fn()
const mockCreateSharingLink = vi.fn()
const mockGetActiveSharingLinks = vi.fn()
const mockGetAllSharingLinks = vi.fn()
const mockRevokeSharingLink = vi.fn()
const mockUpdateSharingLinkEmail = vi.fn()
const mockRevalidatePath = vi.fn()

vi.mock('@/lib/db/client', () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}))

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}))

vi.mock('@/lib/db/sharing', () => ({
  createSharingLink: mockCreateSharingLink,
  getActiveSharingLinks: mockGetActiveSharingLinks,
  getAllSharingLinks: mockGetAllSharingLinks,
  revokeSharingLink: mockRevokeSharingLink,
  updateSharingLinkEmail: mockUpdateSharingLinkEmail,
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createSharingLinkAction', () => {
  it('gibt VALIDATION_ERROR zurück bei ungültigen Eingabedaten', async () => {
    const { createSharingLinkAction } =
      await import('@/lib/actions/sharing-actions')
    const result = await createSharingLinkAction({
      dateRange: 'ungueltig' as never,
      accessDuration: '24h',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('gibt VALIDATION_ERROR zurück wenn custom ohne Von-Bis-Datum', async () => {
    const { createSharingLinkAction } =
      await import('@/lib/actions/sharing-actions')
    const result = await createSharingLinkAction({
      dateRange: 'custom',
      accessDuration: '24h',
      // customFrom und customTo fehlen
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('gibt VALIDATION_ERROR zurück wenn customFrom > customTo', async () => {
    const { createSharingLinkAction } =
      await import('@/lib/actions/sharing-actions')
    const result = await createSharingLinkAction({
      dateRange: 'custom',
      accessDuration: '24h',
      customFrom: '2026-12-31',
      customTo: '2026-01-01',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('gibt VALIDATION_ERROR zurück wenn customTo in der Zukunft liegt', async () => {
    const { createSharingLinkAction } =
      await import('@/lib/actions/sharing-actions')
    const result = await createSharingLinkAction({
      dateRange: 'custom',
      accessDuration: '24h',
      customFrom: '2026-01-01',
      customTo: '2099-12-31',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('gibt AUTH_REQUIRED zurück wenn nicht authentifiziert', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { createSharingLinkAction } =
      await import('@/lib/actions/sharing-actions')
    const result = await createSharingLinkAction({
      dateRange: '1m',
      accessDuration: '24h',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('AUTH_REQUIRED')
  })

  it('erstellt Sharing-Link erfolgreich und ruft revalidatePath auf', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const mockLink = {
      id: 'link-1',
      accountId: 'user-1',
      token: 'a'.repeat(64),
      dateFrom: '2026-02-13',
      dateTo: '2026-03-15',
      expiresAt: '2026-03-16T00:00:00.000Z',
      recipientEmail: null,
      revokedAt: null,
      createdAt: '2026-03-15T10:00:00.000Z',
      shareUrl: `https://app.example.com/share/${'a'.repeat(64)}`,
      isActive: true,
    }
    mockCreateSharingLink.mockResolvedValue({ data: mockLink, error: null })

    const { createSharingLinkAction } =
      await import('@/lib/actions/sharing-actions')
    const result = await createSharingLinkAction({
      dateRange: '1m',
      accessDuration: '24h',
    })

    expect(result.data).toEqual(mockLink)
    expect(result.error).toBeNull()
    expect(mockCreateSharingLink).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      expect.objectContaining({ dateRange: '1m', accessDuration: '24h' }),
    )
    expect(mockRevalidatePath).toHaveBeenCalledWith('/more')
  })

  it('erstellt Sharing-Link mit Empfänger-E-Mail', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockCreateSharingLink.mockResolvedValue({
      data: {
        id: 'link-e',
        shareUrl: 'https://app.example.com/share/x',
        recipientEmail: 'dr@hospital.ch',
      },
      error: null,
    })

    const { createSharingLinkAction } =
      await import('@/lib/actions/sharing-actions')
    const result = await createSharingLinkAction({
      dateRange: '3m',
      accessDuration: '48h',
      recipientEmail: 'dr@hospital.ch',
    })

    expect(result.error).toBeNull()
    expect(mockCreateSharingLink).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      expect.objectContaining({ recipientEmail: 'dr@hospital.ch' }),
    )
  })

  it('gibt VALIDATION_ERROR zurück wenn E-Mail-Format ungültig', async () => {
    const { createSharingLinkAction } =
      await import('@/lib/actions/sharing-actions')
    const result = await createSharingLinkAction({
      dateRange: '1m',
      accessDuration: '24h',
      recipientEmail: 'keine-gueltige-email',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('erstellt Sharing-Link ohne E-Mail wenn leerer String übergeben', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockCreateSharingLink.mockResolvedValue({
      data: { id: 'link-x', shareUrl: 'https://app.example.com/share/y' },
      error: null,
    })

    const { createSharingLinkAction } =
      await import('@/lib/actions/sharing-actions')
    await createSharingLinkAction({
      dateRange: '1m',
      accessDuration: '24h',
      recipientEmail: '',
    })

    expect(mockCreateSharingLink).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      expect.objectContaining({ recipientEmail: undefined }),
    )
  })

  it('gibt DB-Fehler weiter und ruft revalidatePath NICHT auf', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockCreateSharingLink.mockResolvedValue({
      data: null,
      error: { error: 'DB-Fehler', code: 'DB_ERROR' },
    })

    const { createSharingLinkAction } =
      await import('@/lib/actions/sharing-actions')
    const result = await createSharingLinkAction({
      dateRange: '3m',
      accessDuration: '48h',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('DB_ERROR')
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  it('erstellt Link mit individuellem Zeitraum (custom)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockCreateSharingLink.mockResolvedValue({
      data: { id: 'link-2', shareUrl: 'https://app.example.com/share/x' },
      error: null,
    })

    const { createSharingLinkAction } =
      await import('@/lib/actions/sharing-actions')
    await createSharingLinkAction({
      dateRange: 'custom',
      accessDuration: '7d',
      customFrom: '2026-01-01',
      customTo: '2026-03-01',
    })

    expect(mockCreateSharingLink).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      expect.objectContaining({
        dateRange: 'custom',
        accessDuration: '7d',
        customFrom: '2026-01-01',
        customTo: '2026-03-01',
      }),
    )
  })
})

describe('updateSharingLinkEmailAction', () => {
  it('gibt VALIDATION_ERROR zurück bei ungültigem E-Mail-Format', async () => {
    const { updateSharingLinkEmailAction } =
      await import('@/lib/actions/sharing-actions')
    const result = await updateSharingLinkEmailAction(
      'link-1',
      'keine-gueltige-email',
    )

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('gibt AUTH_REQUIRED zurück wenn nicht authentifiziert', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { updateSharingLinkEmailAction } =
      await import('@/lib/actions/sharing-actions')
    const result = await updateSharingLinkEmailAction(
      'link-1',
      'dr@hospital.ch',
    )

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('AUTH_REQUIRED')
  })

  it('speichert E-Mail erfolgreich', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockUpdateSharingLinkEmail.mockResolvedValue({ data: null, error: null })

    const { updateSharingLinkEmailAction } =
      await import('@/lib/actions/sharing-actions')
    const result = await updateSharingLinkEmailAction(
      'link-1',
      'dr@hospital.ch',
    )

    expect(result.error).toBeNull()
    expect(mockUpdateSharingLinkEmail).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      'link-1',
      'dr@hospital.ch',
    )
  })
})

describe('loadActiveSharingLinks', () => {
  it('gibt AUTH_REQUIRED zurück wenn nicht authentifiziert', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { loadActiveSharingLinks } =
      await import('@/lib/actions/sharing-actions')
    const result = await loadActiveSharingLinks()

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('AUTH_REQUIRED')
  })

  it('gibt aktive Links zurück wenn authentifiziert', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const mockLinks = [
      {
        id: 'link-1',
        token: 'a'.repeat(64),
        dateFrom: '2026-02-15',
        dateTo: '2026-03-15',
        expiresAt: '2099-01-01T00:00:00.000Z',
        createdAt: '2026-03-15T10:00:00.000Z',
        shareUrl: 'https://app.example.com/share/' + 'a'.repeat(64),
        isActive: true,
        status: 'active' as const,
        revokedAt: null,
      },
    ]
    mockGetActiveSharingLinks.mockResolvedValue({
      data: mockLinks,
      error: null,
    })

    const { loadActiveSharingLinks } =
      await import('@/lib/actions/sharing-actions')
    const result = await loadActiveSharingLinks()

    expect(result.data).toEqual(mockLinks)
    expect(result.error).toBeNull()
    expect(mockGetActiveSharingLinks).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
    )
  })
})

describe('loadAllSharingLinks', () => {
  it('gibt AUTH_REQUIRED zurück wenn nicht authentifiziert', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { loadAllSharingLinks } =
      await import('@/lib/actions/sharing-actions')
    const result = await loadAllSharingLinks()

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('AUTH_REQUIRED')
  })

  it('gibt alle Links zurück (aktiv + abgelaufen + widerrufen)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const mockLinks = [
      {
        id: 'link-active',
        token: 'a'.repeat(64),
        dateFrom: '2026-02-15',
        dateTo: '2026-03-15',
        expiresAt: '2099-01-01T00:00:00.000Z',
        createdAt: '2026-03-15T10:00:00.000Z',
        shareUrl: 'https://app.example.com/share/' + 'a'.repeat(64),
        isActive: true,
        status: 'active' as const,
        revokedAt: null,
      },
      {
        id: 'link-expired',
        token: 'b'.repeat(64),
        dateFrom: '2025-01-01',
        dateTo: '2025-02-01',
        expiresAt: '2025-02-08T00:00:00.000Z',
        createdAt: '2025-01-01T10:00:00.000Z',
        shareUrl: 'https://app.example.com/share/' + 'b'.repeat(64),
        isActive: false,
        status: 'expired' as const,
        revokedAt: null,
      },
    ]
    mockGetAllSharingLinks.mockResolvedValue({ data: mockLinks, error: null })

    const { loadAllSharingLinks } =
      await import('@/lib/actions/sharing-actions')
    const result = await loadAllSharingLinks()

    expect(result.data).toEqual(mockLinks)
    expect(result.error).toBeNull()
    expect(mockGetAllSharingLinks).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
    )
  })
})

describe('revokeSharingLinkAction', () => {
  it('gibt VALIDATION_ERROR zurück bei ungültiger Link-ID (keine UUID)', async () => {
    const { revokeSharingLinkAction } =
      await import('@/lib/actions/sharing-actions')
    const result = await revokeSharingLinkAction('keine-gueltige-uuid')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('VALIDATION_ERROR')
  })

  it('gibt AUTH_REQUIRED zurück wenn nicht authentifiziert', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { revokeSharingLinkAction } =
      await import('@/lib/actions/sharing-actions')
    const result = await revokeSharingLinkAction(
      '550e8400-e29b-41d4-a716-446655440000',
    )

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('AUTH_REQUIRED')
  })

  it('widerruft Link erfolgreich und ruft revalidatePath auf', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockRevokeSharingLink.mockResolvedValue({ data: null, error: null })

    const { revokeSharingLinkAction } =
      await import('@/lib/actions/sharing-actions')
    const result = await revokeSharingLinkAction(
      '550e8400-e29b-41d4-a716-446655440000',
    )

    expect(result.data).toBeNull()
    expect(result.error).toBeNull()
    expect(mockRevokeSharingLink).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      '550e8400-e29b-41d4-a716-446655440000',
    )
    expect(mockRevalidatePath).toHaveBeenCalledWith('/more')
  })

  it('gibt DB-Fehler weiter und ruft revalidatePath NICHT auf', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockRevokeSharingLink.mockResolvedValue({
      data: null,
      error: { error: 'DB-Fehler', code: 'DB_ERROR' },
    })

    const { revokeSharingLinkAction } =
      await import('@/lib/actions/sharing-actions')
    const result = await revokeSharingLinkAction(
      '550e8400-e29b-41d4-a716-446655440000',
    )

    expect(result.error?.code).toBe('DB_ERROR')
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })
})
