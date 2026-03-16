/**
 * E2E Tests: Story 6.1 — Arzt-Dashboard mit KI-Zusammenfassung
 *
 * Testet:
 * 9.1 Sharing-Link erstellen → Token-Route → Dashboard → KI-Zusammenfassung sichtbar
 * 9.2 Mock AI-Response via E2E_MOCK_SUMMARY=true (wie E2E_MOCK_EXTRACTION Pattern)
 * 9.3 Summary-Inhalt wird nach Laden angezeigt (Suspense Streaming)
 * 9.4 Zweiter Dashboard-Besuch lädt Summary sofort (Cache)
 *
 * Voraussetzung: E2E_MOCK_SUMMARY=true in .env.local (verhindert echten Claude-API-Call)
 */
import { test, expect } from './fixtures/auth.fixture'
import {
  cleanupTestSharingLinks,
  createTestSharingLink,
  createTestSharingSummary,
  createTestSymptomEvent,
  generateTestToken,
  getTestSharingSummary,
  getTestUserId,
} from './fixtures/test-data'

let testUserId: string

test.beforeAll(async () => {
  testUserId = await getTestUserId()
  await cleanupTestSharingLinks(testUserId)
})

test.afterAll(async () => {
  await cleanupTestSharingLinks(testUserId)
})

test.describe('Arzt-Dashboard KI-Zusammenfassung', () => {
  test('9.1 — Dashboard lädt und zeigt KI-Zusammenfassung mit Inhalt an', async ({
    page,
  }) => {
    const token = generateTestToken()
    const dateFrom = '2026-01-01'
    const dateTo = '2026-03-15'

    await createTestSymptomEvent(testUserId, {
      raw_input: 'Kopfschmerzen rechts stechend',
      status: 'confirmed',
      occurred_at: '2026-02-01T08:00:00Z',
    })

    await createTestSharingLink(testUserId, {
      token,
      date_from: dateFrom,
      date_to: dateTo,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })

    await page.goto(`/share/${token}`)
    await page.waitForURL('**/share/dashboard**')

    // Dashboard-Titel sichtbar
    await expect(page.getByText('KI-Zusammenfassung')).toBeVisible()

    // Summary-Inhalt verifizieren (E2E_MOCK_SUMMARY=true → deterministische Mock-Antwort)
    await expect(
      page.getByText(/Mock-Zusammenfassung.*Events im Zeitraum/),
    ).toBeVisible({ timeout: 10000 })
  })

  test('9.3 — Summary-Inhalt erscheint nach Suspense-Streaming', async ({
    page,
  }) => {
    const token = generateTestToken()

    await createTestSharingLink(testUserId, {
      token,
      date_from: '2026-01-01',
      date_to: '2026-03-15',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })

    await page.goto(`/share/${token}`)
    await page.waitForURL('**/share/dashboard**')

    // KI-Zusammenfassung Abschnitt mit Inhalt sichtbar
    // (Suspense-Boundary rendert erst Skeleton, dann streamt Summary-Inhalt)
    // Hinweis: Mit E2E_MOCK_SUMMARY=true ist der Mock-Response sofort verfügbar,
    // daher ist der Skeleton-Übergang zu schnell für E2E-Verifikation.
    await expect(page.getByText('KI-Zusammenfassung')).toBeVisible({
      timeout: 10000,
    })

    // Verifiziere dass tatsächlicher Summary-Inhalt gerendert wird (nicht nur Heading)
    await expect(page.getByText(/Mock-Zusammenfassung/)).toBeVisible({
      timeout: 10000,
    })
  })

  test('9.4 — Zweiter Dashboard-Besuch lädt Summary sofort aus Cache', async ({
    page,
  }) => {
    const token = generateTestToken()

    const link = await createTestSharingLink(testUserId, {
      token,
      date_from: '2026-01-01',
      date_to: '2026-03-15',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })

    // Pre-populate cache mit gecachter Summary
    await createTestSharingSummary(link.id, {
      summary_text:
        'Gecachte Zusammenfassung: 2 Events im Zeitraum.\n\nHäufigste Beschwerde: Kopfschmerzen.',
      event_count: 2,
    })

    await page.goto(`/share/${token}`)
    await page.waitForURL('**/share/dashboard**')

    // Gecachte Summary sollte sofort sichtbar sein
    await expect(page.getByText('KI-Zusammenfassung')).toBeVisible()

    // Gecachten Summary-Text im UI verifizieren
    await expect(
      page.getByText('Häufigste Beschwerde: Kopfschmerzen.'),
    ).toBeVisible({ timeout: 10000 })

    // Verify summary was cached (check DB)
    const summary = await getTestSharingSummary(link.id)
    expect(summary).not.toBeNull()
    expect(summary?.event_count).toBe(2)
  })
})
