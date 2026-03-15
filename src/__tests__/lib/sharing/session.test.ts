import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const originalSecret = process.env.SHARING_HMAC_SECRET

beforeEach(() => {
  process.env.SHARING_HMAC_SECRET = 'test-sharing-session-secret-32bytes'
})

afterEach(() => {
  process.env.SHARING_HMAC_SECRET = originalSecret
})

const TEST_LINK_ID = '550e8400-e29b-41d4-a716-446655440000'
const TEST_EXPIRES_AT = '2099-01-01T00:00:00.000Z'

describe('createSharingSessionCookie', () => {
  it('erstellt einen Cookie-Wert mit 3 Teilen (linkId:expiresAtUnix:signature)', async () => {
    const { createSharingSessionCookie } = await import('@/lib/sharing/session')
    const cookie = createSharingSessionCookie(TEST_LINK_ID, TEST_EXPIRES_AT)

    const parts = cookie.split(':')
    expect(parts).toHaveLength(3)
  })

  it('enthält die korrekte linkId im ersten Teil', async () => {
    const { createSharingSessionCookie } = await import('@/lib/sharing/session')
    const cookie = createSharingSessionCookie(TEST_LINK_ID, TEST_EXPIRES_AT)

    expect(cookie.startsWith(TEST_LINK_ID + ':')).toBe(true)
  })

  it('enthält einen Unix-Timestamp im zweiten Teil', async () => {
    const { createSharingSessionCookie } = await import('@/lib/sharing/session')
    const cookie = createSharingSessionCookie(TEST_LINK_ID, TEST_EXPIRES_AT)

    const parts = cookie.split(':')
    const expiresAtUnix = parseInt(parts[1], 10)
    expect(isNaN(expiresAtUnix)).toBe(false)
    expect(expiresAtUnix).toBeGreaterThan(0)
  })

  it('enthält eine 64-Zeichen Hex-Signatur im dritten Teil', async () => {
    const { createSharingSessionCookie } = await import('@/lib/sharing/session')
    const cookie = createSharingSessionCookie(TEST_LINK_ID, TEST_EXPIRES_AT)

    const parts = cookie.split(':')
    expect(parts[2]).toMatch(/^[0-9a-f]{64}$/)
  })

  it('wirft Error wenn SHARING_HMAC_SECRET fehlt', async () => {
    delete process.env.SHARING_HMAC_SECRET

    const { createSharingSessionCookie } = await import('@/lib/sharing/session')
    expect(() =>
      createSharingSessionCookie(TEST_LINK_ID, TEST_EXPIRES_AT),
    ).toThrow('SHARING_HMAC_SECRET')
  })
})

describe('parseSharingSession', () => {
  it('parsed einen validen Cookie-Wert erfolgreich', async () => {
    const { createSharingSessionCookie, parseSharingSession } =
      await import('@/lib/sharing/session')
    const cookie = createSharingSessionCookie(TEST_LINK_ID, TEST_EXPIRES_AT)
    const result = parseSharingSession(cookie)

    expect(result).not.toBeNull()
    expect(result?.linkId).toBe(TEST_LINK_ID)
    expect(result?.expiresAt).toBeGreaterThan(0)
    expect(result?.signature).toMatch(/^[0-9a-f]{64}$/)
  })

  it('gibt null zurück bei manipulierter Signatur', async () => {
    const { createSharingSessionCookie, parseSharingSession } =
      await import('@/lib/sharing/session')
    const cookie = createSharingSessionCookie(TEST_LINK_ID, TEST_EXPIRES_AT)
    const parts = cookie.split(':')
    const tampered = `${parts[0]}:${parts[1]}:${'f'.repeat(64)}`

    expect(parseSharingSession(tampered)).toBeNull()
  })

  it('gibt null zurück bei manipulierter linkId', async () => {
    const { createSharingSessionCookie, parseSharingSession } =
      await import('@/lib/sharing/session')
    const cookie = createSharingSessionCookie(TEST_LINK_ID, TEST_EXPIRES_AT)
    const parts = cookie.split(':')
    // Andere linkId aber originale Signatur
    const tampered = `different-uuid-here:${parts[1]}:${parts[2]}`

    expect(parseSharingSession(tampered)).toBeNull()
  })

  it('gibt null zurück bei manipuliertem expiresAt', async () => {
    const { createSharingSessionCookie, parseSharingSession } =
      await import('@/lib/sharing/session')
    const cookie = createSharingSessionCookie(TEST_LINK_ID, TEST_EXPIRES_AT)
    const parts = cookie.split(':')
    // Anderen Timestamp aber originale Signatur
    const tampered = `${parts[0]}:9999999999:${parts[2]}`

    expect(parseSharingSession(tampered)).toBeNull()
  })

  it('gibt null zurück bei leerem String', async () => {
    const { parseSharingSession } = await import('@/lib/sharing/session')
    expect(parseSharingSession('')).toBeNull()
  })

  it('gibt null zurück bei zu wenigen Teilen (kein Doppelpunkt)', async () => {
    const { parseSharingSession } = await import('@/lib/sharing/session')
    expect(parseSharingSession('nur-ein-teil')).toBeNull()
  })

  it('gibt null zurück bei zu wenigen Teilen (ein Doppelpunkt)', async () => {
    const { parseSharingSession } = await import('@/lib/sharing/session')
    expect(parseSharingSession('zwei:teile')).toBeNull()
  })

  it('gibt null zurück wenn SHARING_HMAC_SECRET fehlt (keine Signatur-Prüfung möglich)', async () => {
    delete process.env.SHARING_HMAC_SECRET

    const { parseSharingSession } = await import('@/lib/sharing/session')
    // Manuell zusammengesetzter Cookie (Signatur egal, da Secret fehlt)
    const expiresAtUnix = Math.floor(new Date(TEST_EXPIRES_AT).getTime() / 1000)
    const fakeCookie = `${TEST_LINK_ID}:${expiresAtUnix}:${'a'.repeat(64)}`

    expect(parseSharingSession(fakeCookie)).toBeNull()
  })

  it('round-trip: create → parse gibt originale linkId zurück', async () => {
    const { createSharingSessionCookie, parseSharingSession } =
      await import('@/lib/sharing/session')
    const linkId = '12345678-abcd-4ef0-89ab-cdef01234567'
    const expiresAt = '2099-06-15T12:00:00.000Z'

    const cookie = createSharingSessionCookie(linkId, expiresAt)
    const parsed = parseSharingSession(cookie)

    expect(parsed?.linkId).toBe(linkId)
  })
})
