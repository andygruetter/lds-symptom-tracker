import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const originalSecret = process.env.SHARING_HMAC_SECRET

beforeEach(() => {
  process.env.SHARING_HMAC_SECRET = 'test-hmac-secret-fuer-tests'
})

afterEach(() => {
  process.env.SHARING_HMAC_SECRET = originalSecret
})

describe('hashIpAddress', () => {
  it('gibt einen 64-Zeichen SHA-256 Hex-Hash zurück', async () => {
    const { hashIpAddress } = await import('@/lib/utils/crypto')
    const hash = hashIpAddress('192.168.1.1')

    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('ist deterministisch (gleiche IP → gleicher Hash)', async () => {
    const { hashIpAddress } = await import('@/lib/utils/crypto')
    const ip = '10.0.0.1'

    expect(hashIpAddress(ip)).toBe(hashIpAddress(ip))
  })

  it('unterschiedliche IPs ergeben unterschiedliche Hashes', async () => {
    const { hashIpAddress } = await import('@/lib/utils/crypto')

    expect(hashIpAddress('192.168.1.1')).not.toBe(hashIpAddress('192.168.1.2'))
  })

  it('ist nicht umkehrbar (Hash enthält nicht die Original-IP)', async () => {
    const { hashIpAddress } = await import('@/lib/utils/crypto')
    const ip = '192.168.1.100'
    const hash = hashIpAddress(ip)

    expect(hash).not.toContain(ip)
    expect(hash).not.toContain('192')
  })

  it('hashiert auch "unknown" ohne Fehler', async () => {
    const { hashIpAddress } = await import('@/lib/utils/crypto')

    expect(() => hashIpAddress('unknown')).not.toThrow()
    expect(hashIpAddress('unknown')).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe('generateSharingToken', () => {
  it('generiert einen 64-Zeichen Hex-Token', async () => {
    const { generateSharingToken } = await import('@/lib/utils/crypto')
    const token = generateSharingToken()

    expect(token).toMatch(/^[0-9a-f]{64}$/)
  })

  it('generiert zwei unterschiedliche Tokens (Uniqueness)', async () => {
    const { generateSharingToken } = await import('@/lib/utils/crypto')
    const token1 = generateSharingToken()
    const token2 = generateSharingToken()

    expect(token1).not.toBe(token2)
  })

  it('generiert nicht-erratbare Token (kein einfacher UUID)', async () => {
    const { generateSharingToken } = await import('@/lib/utils/crypto')
    const token = generateSharingToken()

    // UUID hat Format xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    // HMAC-Token ist ein reiner 64-Zeichen Hex-String ohne Bindestriche
    expect(token).not.toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    )
  })

  it('wirft Error wenn SHARING_HMAC_SECRET fehlt', async () => {
    delete process.env.SHARING_HMAC_SECRET

    const { generateSharingToken } = await import('@/lib/utils/crypto')
    expect(() => generateSharingToken()).toThrow('SHARING_HMAC_SECRET')
  })

  it('wirft Error wenn SHARING_HMAC_SECRET leer ist', async () => {
    process.env.SHARING_HMAC_SECRET = ''

    const { generateSharingToken } = await import('@/lib/utils/crypto')
    // Leerer Secret ist falsy → Error
    expect(() => generateSharingToken()).toThrow('SHARING_HMAC_SECRET')
  })
})
