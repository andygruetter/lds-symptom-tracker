import { test, expect } from './fixtures/auth.fixture'
import { InsightsPage } from './page-objects/insights.page'
import {
  cleanupTestData,
  createMultipleTestEvents,
  createTestExtractedData,
  createTestSymptomEvent,
  createTestEventPhoto,
  getTestUserId,
} from './fixtures/test-data'

test.describe('Insights Feed (Story 4.1)', () => {
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

  test('Leerer Feed zeigt "Noch keine Einträge."', async ({ page }) => {
    await insightsPage.goto()
    await insightsPage.waitForLoaded()

    await expect(page.getByText('Noch keine Einträge.')).toBeVisible()
  })

  test('Feed zeigt Events gruppiert nach Tag mit "Heute"-Header', async ({
    page,
  }) => {
    const now = new Date()
    const todayNoon = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0),
    ).toISOString()

    await createTestSymptomEvent(userId, {
      status: 'confirmed',
      raw_input: 'Kopfschmerzen rechts',
      occurred_at: todayNoon,
    })

    await insightsPage.goto()
    await insightsPage.waitForLoaded()

    await expect(page.getByText('Heute')).toBeVisible()
    await expect(page.getByText('Kopfschmerzen rechts')).toBeVisible()
  })

  test('Symptom-Karte zeigt Name, Körperregion und Intensität', async ({
    page,
  }) => {
    const now = new Date()
    const todayNoon = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0),
    ).toISOString()

    const event = await createTestSymptomEvent(userId, {
      status: 'confirmed',
      raw_input: 'Starke Kopfschmerzen',
      occurred_at: todayNoon,
    })
    await createTestExtractedData(event.id, [
      {
        field_name: 'symptom_name',
        value: 'Kopfschmerzen',
        confidence: 95,
        confirmed: true,
      },
      {
        field_name: 'body_region',
        value: 'Kopf',
        confidence: 90,
        confirmed: true,
      },
      {
        field_name: 'intensity',
        value: '7',
        confidence: 88,
        confirmed: true,
      },
    ])

    await insightsPage.goto()
    await insightsPage.waitForLoaded()

    // Symptom name with bullet prefix
    await expect(page.getByText('● Kopfschmerzen')).toBeVisible()
    // Body region (exact to avoid matching "Kopfschmerzen")
    await expect(page.getByText('Kopf', { exact: true })).toBeVisible()
    // Intensity
    await expect(page.getByText('7/10')).toBeVisible()
    // Type badge
    await expect(page.getByText('Symptom')).toBeVisible()
  })

  test('Medikament-Karte zeigt Medikamentname mit "Medikament"-Badge', async ({
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
      {
        field_name: 'dosage',
        value: '400mg',
        confidence: 90,
        confirmed: true,
      },
    ])

    await insightsPage.goto()
    await insightsPage.waitForLoaded()

    // Medication name with diamond prefix
    await expect(page.getByText('◆ Ibuprofen')).toBeVisible()
    // Dosage
    await expect(page.getByText('400mg')).toBeVisible()
    // Type badge
    await expect(page.getByText('Medikament')).toBeVisible()
  })

  test('Tap auf Event-Karte navigiert zu /event/{id}', async ({ page }) => {
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

    await page.getByText('● Migräne').click()

    await page.waitForURL(`/event/${event.id}`, { timeout: 10_000 })
    expect(page.url()).toContain(`/event/${event.id}`)
  })

  test('"Mehr laden" Pagination mit 25 Events', async ({ page }) => {
    // Create 25 events spread over the last 30 days
    await createMultipleTestEvents(userId, 25, {
      rawInputPrefix: 'Pagination-Symptom',
      status: 'confirmed',
    })

    await insightsPage.goto()
    await insightsPage.waitForLoaded()

    // Feed shows first 20 events by default, "Mehr laden" button should appear
    const loadMoreButton = page.getByText('Mehr laden')
    await expect(loadMoreButton).toBeVisible()

    // Click "Mehr laden" to load the remaining events
    await loadMoreButton.click()

    // Wait for loading to finish (button may briefly show "Lädt…")
    await expect(page.getByText('Lädt…')).not.toBeVisible({ timeout: 10_000 })

    // After loading more, the button should disappear since all 25 are loaded
    await expect(loadMoreButton).not.toBeVisible()
  })

  test('Feed zeigt Media-Indikatoren für Foto und Audio', async ({ page }) => {
    const now = new Date()
    const todayNoon = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0),
    ).toISOString()

    const event = await createTestSymptomEvent(userId, {
      status: 'confirmed',
      raw_input: 'Kopfschmerzen mit Audio',
      occurred_at: todayNoon,
      audio_url: 'test/audio-test.webm',
    })
    await createTestEventPhoto(event.id)
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

    // Audio indicator
    await expect(page.getByTestId('audio-indicator')).toBeVisible()
    // Photo count indicator (Camera icon + count "1")
    await expect(page.getByText('1').first()).toBeVisible()
  })
})
