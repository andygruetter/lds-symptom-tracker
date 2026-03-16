/**
 * E2E Tests: Story 6.5 — PDF-Report generieren und herunterladen
 *
 * Testet:
 * Patient-Flow: Login → Export-Seite → Zeitraum wählen → PDF generieren → Download
 * Doctor-Flow: Sharing-Link → Dashboard → PDF-Button → Download
 */
import { test, expect } from './fixtures/auth.fixture'
import {
  cleanupTestSharingLinks,
  createTestSharingLink,
  createTestSymptomEvent,
  generateTestToken,
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

test.describe('PDF-Export — Patient-Flow', () => {
  test('9.1 — Export-Seite ist erreichbar und zeigt Zeitraum-Auswahl', async ({
    page,
  }) => {
    await page.goto('/export/pdf')
    await expect(
      page.getByRole('heading', { name: 'PDF-Export' }),
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: /Symptom-Report/i }),
    ).toBeVisible()
    await expect(page.getByLabel('Zeitraum')).toBeVisible()
  })

  test('9.2 — Alle Zeitraum-Optionen sind verfügbar', async ({ page }) => {
    await page.goto('/export/pdf')
    const select = page.getByLabel('Zeitraum')
    await expect(select).toBeVisible()
    await expect(select.getByRole('option', { name: '1 Monat' })).toBeAttached()
    await expect(
      select.getByRole('option', { name: '3 Monate' }),
    ).toBeAttached()
    await expect(
      select.getByRole('option', { name: '6 Monate' }),
    ).toBeAttached()
    await expect(
      select.getByRole('option', { name: '12 Monate' }),
    ).toBeAttached()
  })

  test('9.3 — PDF wird generiert und als Download bereitgestellt', async ({
    page,
  }) => {
    await createTestSymptomEvent(testUserId, {
      raw_input: 'Kopfschmerzen links pochend',
      status: 'confirmed',
      occurred_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    })

    await page.goto('/export/pdf')

    // Zeitraum auf 1 Monat setzen
    await page.getByLabel('Zeitraum').selectOption('1m')

    // Download abfangen
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 })

    await page.getByRole('button', { name: /PDF herunterladen/i }).click()

    // Loading-State verifizieren
    await expect(
      page.getByRole('button', { name: /PDF wird erstellt/i }),
    ).toBeVisible({ timeout: 5000 })

    // Download empfangen
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/symptom-report.*\.pdf$/)
  })

  test('9.4 — Drucken-Button ist vorhanden', async ({ page }) => {
    await page.goto('/export/pdf')
    await expect(page.getByTitle('PDF drucken')).toBeVisible()
  })
})

test.describe('PDF-Export — Arzt-Dashboard-Flow', () => {
  test('9.5 — PDF-Download-Button ist im Arzt-Dashboard sichtbar', async ({
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

    await expect(
      page.getByRole('button', { name: /PDF-Report/i }),
    ).toBeVisible()
  })

  test('9.6 — Arzt kann PDF vom Dashboard herunterladen', async ({ page }) => {
    const token = generateTestToken()

    await createTestSymptomEvent(testUserId, {
      raw_input: 'Schwindel beim Aufstehen',
      status: 'confirmed',
      occurred_at: '2026-02-10T10:00:00Z',
    })

    await createTestSharingLink(testUserId, {
      token,
      date_from: '2026-01-01',
      date_to: '2026-03-15',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })

    await page.goto(`/share/${token}`)
    await page.waitForURL('**/share/dashboard**')

    const downloadPromise = page.waitForEvent('download', { timeout: 30000 })

    await page.getByRole('button', { name: /PDF-Report/i }).click()

    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/symptom-report.*\.pdf$/)
  })
})
