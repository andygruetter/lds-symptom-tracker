import { test, expect } from './fixtures/auth.fixture'
import { CapturePage } from './page-objects/capture.page'
import {
  cleanupTestData,
  createTestExtractedData,
  createTestSymptomEvent,
  getTestUserId,
} from './fixtures/test-data'

test.describe('Review und Bestätigung', () => {
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

  test('zeigt ReviewBubble mit extrahierten Feldern nach Extraktion', async ({
    page,
  }) => {
    const event = await createTestSymptomEvent(userId, {
      raw_input: 'Kopfschmerzen rechts stechend',
      status: 'extracted',
    })
    await createTestExtractedData(event.id, [
      { field_name: 'symptom_name', value: 'Kopfschmerzen', confidence: 95 },
      { field_name: 'Körperregion', value: 'Kopf', confidence: 90 },
      { field_name: 'Seite', value: 'rechts', confidence: 85 },
    ])

    await capturePage.goto()

    // SymptomTag buttons have aria-label like "fieldName ändern"
    await expect(
      page.getByRole('button', { name: 'symptom_name ändern' }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Körperregion ändern' }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /Bestätigen/i }),
    ).toBeVisible()
  })

  test('zeigt Konfidenz-Indikator mit Score', async ({ page }) => {
    const event = await createTestSymptomEvent(userId, {
      raw_input: 'Bauchschmerzen',
      status: 'extracted',
    })
    await createTestExtractedData(event.id, [
      {
        field_name: 'symptom_name',
        value: 'Bauchschmerzen',
        confidence: 90,
      },
    ])

    await capturePage.goto()

    await expect(
      page.locator('[role="img"][aria-label*="Konfidenz"]'),
    ).toBeVisible()
  })

  test('Bestätigen wechselt zu "Gespeichert" Status', async ({ page }) => {
    const event = await createTestSymptomEvent(userId, {
      raw_input: 'Kopfschmerzen',
      status: 'extracted',
    })
    await createTestExtractedData(event.id, [
      {
        field_name: 'symptom_name',
        value: 'Kopfschmerzen',
        confidence: 95,
      },
    ])

    await capturePage.goto()
    await capturePage.confirmExtraction()
    await capturePage.waitForConfirmed()
    await expect(page.getByText('Gespeichert ✓')).toBeVisible()
  })

  test('zeigt "Wird bestätigt..." während Bestätigung', async ({ page }) => {
    const event = await createTestSymptomEvent(userId, {
      raw_input: 'Knieschmerzen',
      status: 'extracted',
    })
    await createTestExtractedData(event.id, [
      {
        field_name: 'symptom_name',
        value: 'Knieschmerzen',
        confidence: 95,
      },
    ])

    await capturePage.goto()
    await page.getByRole('button', { name: /Bestätigen/i }).click()
    await expect(page.getByText('Wird bestätigt...')).toBeVisible()
  })

  test('zeigt Ändern-Button neben Bestätigen', async ({ page }) => {
    const event = await createTestSymptomEvent(userId, {
      raw_input: 'Schmerzen',
      status: 'extracted',
    })
    await createTestExtractedData(event.id, [
      { field_name: 'symptom_name', value: 'Schmerzen', confidence: 85 },
    ])

    await capturePage.goto()
    await expect(
      page.getByRole('button', { name: 'Ändern', exact: true }),
    ).toBeVisible()
  })
})
