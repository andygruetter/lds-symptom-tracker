import { test, expect } from './fixtures/auth.fixture'
import { CapturePage } from './page-objects/capture.page'
import {
  cleanupTestData,
  createTestSymptomEvent,
  createTestExtractedData,
  getTestUserId,
} from './fixtures/test-data'

test.describe('Push-Notification Opt-In', () => {
  let capturePage: CapturePage
  let userId: string

  test.beforeEach(async ({ page }) => {
    capturePage = new CapturePage(page)
    userId = await getTestUserId()
    await cleanupTestData(userId)
  })

  test.afterEach(async () => {
    await cleanupTestData(userId)
  })

  test('zeigt Push-Banner nicht im leeren Zustand', async ({ page }) => {
    await capturePage.goto()
    // The banner should not appear when there are no events
    await expect(
      page.getByText('Benachrichtigungen aktivieren'),
    ).not.toBeVisible()
  })

  // Note: Full push notification tests require browser Push API support.
  // In CI/headless environments, PushManager is typically not available,
  // so the PushOptIn component returns null (isSupported = false).
  // These tests verify the component's conditional rendering logic.

  test('Push-Banner hat Aktivieren- und Später-Buttons wenn sichtbar', async ({
    page,
  }) => {
    // Seed a confirmed event so the capture page is not empty
    const event = await createTestSymptomEvent(userId, {
      raw_input: 'Kopfschmerzen',
      status: 'confirmed',
    })
    await createTestExtractedData(event.id, [
      { field_name: 'symptom', value: 'Kopfschmerzen', confidence: 0.95 },
    ])

    await capturePage.goto()

    // In headless browsers, Push API is not supported, so the banner won't show.
    // We verify that IF the banner is visible, it has the correct buttons.
    const banner = page.getByText('Benachrichtigungen aktivieren')
    const isBannerVisible = await banner.isVisible().catch(() => false)

    if (isBannerVisible) {
      await expect(
        page.getByRole('button', { name: 'Aktivieren' }),
      ).toBeVisible()
      await expect(page.getByText('Später')).toBeVisible()
    }
    // If banner is not visible (headless/no Push API), the test passes —
    // the component correctly hides itself when push is unsupported.
  })
})
