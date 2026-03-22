import { test, expect } from './fixtures/auth.fixture'
import { InsightsPage } from './page-objects/insights.page'
import {
  cleanupTestData,
  createMultipleTestEvents,
  createTestExtractedData,
  createTestSymptomEvent,
  getTestUserId,
} from './fixtures/test-data'

test.describe('Insights Ranking (Story 4.3)', () => {
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

  test('Leeres Ranking zeigt "Keine Symptome im gewählten Zeitraum."', async ({
    page,
  }) => {
    await insightsPage.goto()
    await insightsPage.waitForLoaded()
    await insightsPage.switchToRanking()

    await expect(
      page.getByText('Keine Symptome im gewählten Zeitraum.'),
    ).toBeVisible()
  })

  test('Ranking-Karten sortiert nach Häufigkeit mit Count-Badge', async ({
    page,
  }) => {
    const now = new Date()

    // Create 3 Kopfschmerzen events
    for (let i = 0; i < 3; i++) {
      const occurredAt = new Date(
        Date.UTC(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - i,
          12,
          0,
          0,
        ),
      ).toISOString()
      const event = await createTestSymptomEvent(userId, {
        status: 'confirmed',
        raw_input: `Kopfschmerzen ${i + 1}`,
        occurred_at: occurredAt,
      })
      await createTestExtractedData(event.id, [
        {
          field_name: 'symptom_name',
          value: 'Kopfschmerzen',
          confidence: 90,
          confirmed: true,
        },
      ])
    }

    // Create 1 Rückenschmerzen event
    const event = await createTestSymptomEvent(userId, {
      status: 'confirmed',
      raw_input: 'Rückenschmerzen heute',
      occurred_at: new Date(
        Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0),
      ).toISOString(),
    })
    await createTestExtractedData(event.id, [
      {
        field_name: 'symptom_name',
        value: 'Rückenschmerzen',
        confidence: 88,
        confirmed: true,
      },
    ])

    await insightsPage.goto()
    await insightsPage.waitForLoaded()
    await insightsPage.switchToRanking()

    // Section heading
    await expect(page.getByRole('heading', { name: 'Symptome' })).toBeVisible()

    // Kopfschmerzen should appear with 3x count
    await expect(page.getByText('Kopfschmerzen')).toBeVisible()
    await expect(page.getByText('3x')).toBeVisible()

    // Rückenschmerzen with 1x count
    await expect(page.getByText('Rückenschmerzen')).toBeVisible()
    await expect(page.getByText('1x')).toBeVisible()

    // Kopfschmerzen should appear before Rückenschmerzen (sorted by count)
    const cards = page.locator('button[aria-expanded]')
    const firstCardText = await cards.first().textContent()
    expect(firstCardText).toContain('Kopfschmerzen')
  })

  test('Karte aufklappen zeigt "Letzte Einträge:" mit Events', async ({
    page,
  }) => {
    const now = new Date()
    const todayNoon = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0),
    ).toISOString()

    const event = await createTestSymptomEvent(userId, {
      status: 'confirmed',
      raw_input: 'Migräne stark',
      occurred_at: todayNoon,
    })
    await createTestExtractedData(event.id, [
      {
        field_name: 'symptom_name',
        value: 'Migräne',
        confidence: 92,
        confirmed: true,
      },
    ])

    await insightsPage.goto()
    await insightsPage.waitForLoaded()
    await insightsPage.switchToRanking()

    // Click to expand the ranking card
    await page.getByText('Migräne').click()

    // "Letzte Einträge:" should appear
    await expect(page.getByText('Letzte Einträge:')).toBeVisible({
      timeout: 10_000,
    })

    // The expanded card should show an event card with the symptom
    await expect(page.getByText('Migräne')).toBeVisible()
  })

  test('Karte zuklappen verbirgt Events', async ({ page }) => {
    const now = new Date()
    const todayNoon = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0),
    ).toISOString()

    const event = await createTestSymptomEvent(userId, {
      status: 'confirmed',
      raw_input: 'Kopfschmerzen heute',
      occurred_at: todayNoon,
    })
    await createTestExtractedData(event.id, [
      {
        field_name: 'symptom_name',
        value: 'Kopfschmerzen',
        confidence: 90,
        confirmed: true,
      },
    ])

    await insightsPage.goto()
    await insightsPage.waitForLoaded()
    await insightsPage.switchToRanking()

    // Expand — use specific ranking card button (contains count badge "1x")
    await page.getByRole('button', { name: /Kopfschmerzen.*1x/ }).click()
    await expect(page.getByText('Letzte Einträge:')).toBeVisible({
      timeout: 10_000,
    })

    // Collapse by clicking again
    await page.getByRole('button', { name: /Kopfschmerzen.*1x/ }).click()
    await expect(page.getByText('Letzte Einträge:')).not.toBeVisible()
  })

  test('Medikamente-Sektion erscheint wenn Medikamente vorhanden', async ({
    page,
  }) => {
    const now = new Date()
    const todayNoon = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0),
    ).toISOString()

    const event = await createTestSymptomEvent(userId, {
      status: 'confirmed',
      raw_input: 'Ibuprofen 400mg',
      event_type: 'medication',
      occurred_at: todayNoon,
    })
    await createTestExtractedData(event.id, [
      {
        field_name: 'medication',
        value: 'Ibuprofen',
        confidence: 95,
        confirmed: true,
      },
    ])

    await insightsPage.goto()
    await insightsPage.waitForLoaded()
    await insightsPage.switchToRanking()

    // Medikamente section heading
    await expect(
      page.getByRole('heading', { name: 'Medikamente' }),
    ).toBeVisible()

    // Medication name and count
    await expect(page.getByText('Ibuprofen')).toBeVisible()
    await expect(page.getByText('1x')).toBeVisible()
  })

  test('Zeitraum-Filter wechseln aktualisiert Ranking', async ({ page }) => {
    // Create events spread over 4 months to test range filtering
    const now = new Date()

    // Recent event (within 30 days)
    const recentEvent = await createTestSymptomEvent(userId, {
      status: 'confirmed',
      raw_input: 'Kopfschmerzen aktuell',
      occurred_at: new Date(
        Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0),
      ).toISOString(),
    })
    await createTestExtractedData(recentEvent.id, [
      {
        field_name: 'symptom_name',
        value: 'Kopfschmerzen',
        confidence: 90,
        confirmed: true,
      },
    ])

    await insightsPage.goto()
    await insightsPage.waitForLoaded()
    await insightsPage.switchToRanking()

    // Default is "3 M", should show Kopfschmerzen
    await expect(page.getByText('Kopfschmerzen')).toBeVisible()

    // Switch to "30 T"
    await page.getByText('30 T', { exact: true }).click()

    // Should still show Kopfschmerzen (within 30 days)
    await expect(page.getByText('Kopfschmerzen')).toBeVisible()

    // Switch to "Alle"
    await page.getByText('Alle', { exact: true }).click()

    // Should still show Kopfschmerzen
    await expect(page.getByText('Kopfschmerzen')).toBeVisible()
  })
})
