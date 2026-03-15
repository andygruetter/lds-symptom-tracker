import { test, expect } from './fixtures/auth.fixture'
import { InsightsPage } from './page-objects/insights.page'
import { MorePage } from './page-objects/more.page'
import {
  cleanupTestData,
  createTestExtractedData,
  createTestSymptomEvent,
  getTestUserId,
} from './fixtures/test-data'

test.describe('Event Delete (Story 4.5)', () => {
  let userId: string

  test.beforeEach(async () => {
    userId = await getTestUserId()
    await cleanupTestData(userId)
  })

  test.afterEach(async () => {
    await cleanupTestData(userId)
  })

  test('"Alle Daten löschen"-Button sichtbar auf Mehr-Seite', async ({
    page,
  }) => {
    await page.goto('/more')
    await page.getByRole('heading', { name: 'Mehr' }).waitFor()

    await expect(page.getByText('Alle Daten löschen')).toBeVisible()
  })

  test('"Alle Daten löschen" öffnet Bestätigungs-Dialog', async ({ page }) => {
    await page.goto('/more')
    await page.getByRole('heading', { name: 'Mehr' }).waitFor()

    // Click "Alle Daten löschen" button
    await page.getByText('Alle Daten löschen').click()

    // Dialog should appear
    await expect(page.getByText('Alle Daten löschen?')).toBeVisible()
    await expect(page.getByText('Ja, alle Daten löschen')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Abbrechen' })).toBeVisible()
  })

  test('Abbrechen schliesst Dialog ohne zu löschen', async ({ page }) => {
    // Create an event first
    const now = new Date()
    const todayNoon = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0),
    ).toISOString()

    await createTestSymptomEvent(userId, {
      status: 'confirmed',
      raw_input: 'Kopfschmerzen',
      occurred_at: todayNoon,
    })

    await page.goto('/more')
    await page.getByRole('heading', { name: 'Mehr' }).waitFor()

    // Open dialog
    await page.getByText('Alle Daten löschen').click()
    await expect(page.getByText('Alle Daten löschen?')).toBeVisible()

    // Cancel
    await page.getByRole('button', { name: 'Abbrechen' }).click()

    // Dialog should be closed
    await expect(page.getByText('Alle Daten löschen?')).not.toBeVisible()

    // Event should still exist — verify by navigating to insights
    await page.goto('/insights')
    await page.getByRole('heading', { name: 'Auswertung' }).waitFor()
    await expect(page.getByText('Kopfschmerzen')).toBeVisible()
  })

  test('Bestätigung löscht alle Events und zeigt Erfolgsmeldung', async ({
    page,
  }) => {
    const now = new Date()
    const todayNoon = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0),
    ).toISOString()

    // Create 3 events
    for (let i = 0; i < 3; i++) {
      await createTestSymptomEvent(userId, {
        status: 'confirmed',
        raw_input: `Symptom ${i + 1}`,
        occurred_at: new Date(
          new Date(todayNoon).getTime() - i * 3600000,
        ).toISOString(),
      })
    }

    await page.goto('/more')
    await page.getByRole('heading', { name: 'Mehr' }).waitFor()

    // Open dialog and confirm
    await page.getByText('Alle Daten löschen').click()
    await expect(page.getByText('Alle Daten löschen?')).toBeVisible()

    await page.getByText('Ja, alle Daten löschen').click()

    // Success message should appear with count
    await expect(page.getByText('3 Events gelöscht')).toBeVisible({
      timeout: 10_000,
    })
  })

  test('Nach Alle-Löschen zeigt Feed den Leer-Zustand', async ({ page }) => {
    const now = new Date()
    const todayNoon = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0),
    ).toISOString()

    // Create 2 events
    for (let i = 0; i < 2; i++) {
      await createTestSymptomEvent(userId, {
        status: 'confirmed',
        raw_input: `Testsymptom ${i + 1}`,
        occurred_at: new Date(
          new Date(todayNoon).getTime() - i * 3600000,
        ).toISOString(),
      })
    }

    await page.goto('/more')
    await page.getByRole('heading', { name: 'Mehr' }).waitFor()

    // Delete all
    await page.getByText('Alle Daten löschen').click()
    await page.getByText('Ja, alle Daten löschen').click()

    // Wait for success
    await expect(page.getByText('2 Events gelöscht')).toBeVisible({
      timeout: 10_000,
    })

    // Wait for dialog to auto-close (1500ms timeout in component)
    await expect(page.getByText('Alle Daten löschen?')).not.toBeVisible({
      timeout: 5_000,
    })

    // Navigate to insights and verify empty state
    await page.goto('/insights')
    await page.getByRole('heading', { name: 'Auswertung' }).waitFor()

    await expect(page.getByText('Noch keine Einträge.')).toBeVisible()
  })

  test('Einzelnes Event löschen über Detail-Seite', async ({ page }) => {
    const event = await createTestSymptomEvent(userId, {
      status: 'confirmed',
      raw_input: 'Zu löschendes Event',
    })

    await page.goto(`/event/${event.id}`)
    await page.getByRole('heading', { name: 'Event-Details' }).waitFor()

    // Click delete button (trash icon)
    await page.getByRole('button', { name: 'Event löschen' }).click()

    // Confirmation dialog
    await expect(page.getByText('Event löschen?')).toBeVisible()

    // Confirm deletion
    await page.getByText('Ja, Event löschen').click()

    // Should redirect to /insights
    await page.waitForURL('/insights', { timeout: 10_000 })
  })

  test('Einzelnes Event löschen — Abbrechen schliesst Dialog', async ({
    page,
  }) => {
    const event = await createTestSymptomEvent(userId, {
      status: 'confirmed',
      raw_input: 'Event bleibt bestehen',
    })

    await page.goto(`/event/${event.id}`)
    await page.getByRole('heading', { name: 'Event-Details' }).waitFor()

    // Open delete dialog
    await page.getByRole('button', { name: 'Event löschen' }).click()
    await expect(page.getByText('Event löschen?')).toBeVisible()

    // Cancel
    await page.getByRole('button', { name: 'Abbrechen' }).click()

    // Dialog should be closed, still on detail page
    await expect(page.getByText('Event löschen?')).not.toBeVisible()
    await expect(
      page.getByRole('heading', { name: 'Event-Details' }),
    ).toBeVisible()
  })
})
