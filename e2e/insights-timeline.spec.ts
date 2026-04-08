import { test, expect } from './fixtures/auth.fixture'
import { InsightsPage } from './page-objects/insights.page'
import {
  cleanupTestData,
  createTestExtractedData,
  createTestSymptomEvent,
  getTestUserId,
} from './fixtures/test-data'

test.describe('Insights Timeline (Story 4.2)', () => {
  let userId: string
  let insightsPage: InsightsPage

  test.beforeEach(async ({ page }) => {
    userId = await getTestUserId()
    await cleanupTestData(userId)
    insightsPage = new InsightsPage(page)
  })

  test.afterEach(async () => {
    await cleanupTestData(userId)
  })

  test('Kalender-Grid zeigt Wochentag-Header (Mo, Di, ...)', async ({
    page,
  }) => {
    await insightsPage.goto()
    await insightsPage.waitForLoaded()
    await insightsPage.switchToTimeline()

    // Weekday headers
    for (const day of ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']) {
      await expect(page.getByText(day, { exact: true }).first()).toBeVisible()
    }

    // Calendar grid is rendered
    await expect(page.getByTestId('calendar-grid')).toBeVisible()
  })

  test('Aktueller Monat wird im Header angezeigt', async ({ page }) => {
    await insightsPage.goto()
    await insightsPage.waitForLoaded()
    await insightsPage.switchToTimeline()

    // Format current month in de-CH locale
    const now = new Date()
    const expectedMonth = new Intl.DateTimeFormat('de-CH', {
      month: 'long',
      year: 'numeric',
    }).format(now)

    await expect(
      page.getByRole('heading', { name: expectedMonth }),
    ).toBeVisible()
  })

  test('Tag mit Events zeigt Symptom-Dot', async ({ page }) => {
    const now = new Date()
    const todayNoon = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0),
    ).toISOString()

    // Create two symptom events (all events are symptom type now)
    await createTestSymptomEvent(userId, {
      status: 'confirmed',
      raw_input: 'Kopfschmerzen',
      occurred_at: todayNoon,
    })

    await createTestSymptomEvent(userId, {
      status: 'confirmed',
      raw_input: 'Rückenschmerzen',
      event_type: 'symptom',
      occurred_at: todayNoon,
    })

    await insightsPage.goto()
    await insightsPage.waitForLoaded()
    await insightsPage.switchToTimeline()

    // Symptom dot should be visible (no separate medication dot anymore)
    await expect(page.getByTestId('symptom-dot').first()).toBeVisible()
  })

  test('Tap auf Tag mit Events öffnet Drill-Down Panel', async ({ page }) => {
    const now = new Date()
    const todayNoon = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0),
    ).toISOString()

    const event = await createTestSymptomEvent(userId, {
      status: 'confirmed',
      raw_input: 'Rückenschmerzen',
      occurred_at: todayNoon,
    })
    await createTestExtractedData(event.id, [
      {
        field_name: 'symptom_name',
        value: 'Rückenschmerzen',
        confidence: 90,
        confirmed: true,
      },
    ])

    await insightsPage.goto()
    await insightsPage.waitForLoaded()
    await insightsPage.switchToTimeline()

    // Build aria-label for today's date
    const formattedDate = new Intl.DateTimeFormat('de-CH', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(now)

    // Click the day cell that has events
    const dayButton = page.getByRole('button', {
      name: new RegExp(`${formattedDate}.*1 Symptom`),
    })
    await dayButton.click()

    // Drill-down panel should be visible with event card
    await expect(
      page.getByRole('button', { name: 'Drill-Down schliessen' }),
    ).toBeVisible()
    await expect(page.getByText('Rückenschmerzen')).toBeVisible()
  })

  test('Drill-Down Schliessen-Button funktioniert', async ({ page }) => {
    const now = new Date()
    const todayNoon = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0),
    ).toISOString()

    await createTestSymptomEvent(userId, {
      status: 'confirmed',
      raw_input: 'Kopfschmerzen',
      occurred_at: todayNoon,
    })

    await insightsPage.goto()
    await insightsPage.waitForLoaded()
    await insightsPage.switchToTimeline()

    // Click on today
    const formattedDate = new Intl.DateTimeFormat('de-CH', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(now)

    const dayButton = page.getByRole('button', {
      name: new RegExp(`${formattedDate}.*1 Symptom`),
    })
    await dayButton.click()

    // Drill-down is open
    const closeButton = page.getByRole('button', {
      name: 'Drill-Down schliessen',
    })
    await expect(closeButton).toBeVisible()

    // Close drill-down
    await closeButton.click()

    // Drill-down should be gone
    await expect(closeButton).not.toBeVisible()
  })

  test('Navigation zum vorherigen Monat und zurück', async ({ page }) => {
    await insightsPage.goto()
    await insightsPage.waitForLoaded()
    await insightsPage.switchToTimeline()

    const now = new Date()
    const currentMonth = new Intl.DateTimeFormat('de-CH', {
      month: 'long',
      year: 'numeric',
    }).format(now)

    // Verify current month
    await expect(
      page.getByRole('heading', { name: currentMonth }),
    ).toBeVisible()

    // Navigate to previous month
    await page.getByRole('button', { name: 'Vorheriger Monat' }).click()

    // Previous month header
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevMonth = new Intl.DateTimeFormat('de-CH', {
      month: 'long',
      year: 'numeric',
    }).format(prevDate)

    await expect(page.getByRole('heading', { name: prevMonth })).toBeVisible()

    // Navigate forward back to current month
    await page.getByRole('button', { name: 'Nächster Monat' }).click()

    await expect(
      page.getByRole('heading', { name: currentMonth }),
    ).toBeVisible()
  })

  test('Heutiger Tag hat aria-current="date"', async ({ page }) => {
    await insightsPage.goto()
    await insightsPage.waitForLoaded()
    await insightsPage.switchToTimeline()

    // Find button with aria-current="date"
    const todayCell = page.locator('button[aria-current="date"]')
    await expect(todayCell).toBeVisible()
  })
})
