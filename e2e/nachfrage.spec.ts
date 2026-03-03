import { test, expect } from './fixtures/auth.fixture'
import { CapturePage } from './page-objects/capture.page'
import {
  cleanupTestData,
  createTestExtractedData,
  createTestSymptomEvent,
  getTestUserId,
} from './fixtures/test-data'

test.describe('Nachfragen bei unsicheren Feldern', () => {
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

  test('zeigt Nachfrage-Bubble für Feld mit Konfidenz unter 70%', async ({
    page,
  }) => {
    const event = await createTestSymptomEvent(userId, {
      raw_input: 'Schmerzen irgendwo',
      status: 'extracted',
    })
    await createTestExtractedData(event.id, [
      {
        field_name: 'symptom_name',
        value: 'Schmerzen',
        confidence: 90,
      },
      { field_name: 'Seite', value: 'links', confidence: 55 },
    ])

    await capturePage.goto()

    await expect(page.getByText('Welche Seite?')).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Links' }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Rechts' }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Beidseits' }),
    ).toBeVisible()
  })

  test('Antwort auf Nachfrage speichert den Wert', async ({ page }) => {
    const event = await createTestSymptomEvent(userId, {
      raw_input: 'Rückenschmerzen',
      status: 'extracted',
    })
    await createTestExtractedData(event.id, [
      {
        field_name: 'symptom_name',
        value: 'Rückenschmerzen',
        confidence: 95,
      },
      { field_name: 'Seite', value: 'unbekannt', confidence: 50 },
    ])

    await capturePage.goto()
    await capturePage.answerClarification('Links')

    await expect(page.getByText('Links').last()).toBeVisible()
  })

  test('zeigt "Andere Antwort..." Button für Freitext', async ({ page }) => {
    const event = await createTestSymptomEvent(userId, {
      raw_input: 'Schmerzen',
      status: 'extracted',
    })
    await createTestExtractedData(event.id, [
      {
        field_name: 'symptom_name',
        value: 'Schmerzen',
        confidence: 90,
      },
      { field_name: 'Seite', value: 'unbekannt', confidence: 50 },
    ])

    await capturePage.goto()

    await expect(
      page.getByRole('button', { name: 'Andere Antwort...' }),
    ).toBeVisible()
  })

  test('Freitext-Eingabe bei Nachfrage funktioniert', async ({ page }) => {
    const event = await createTestSymptomEvent(userId, {
      raw_input: 'Schmerzen',
      status: 'extracted',
    })
    await createTestExtractedData(event.id, [
      {
        field_name: 'symptom_name',
        value: 'Schmerzen',
        confidence: 90,
      },
      { field_name: 'Seite', value: 'unbekannt', confidence: 50 },
    ])

    await capturePage.goto()

    await page.getByRole('button', { name: 'Andere Antwort...' }).click()
    await page.getByPlaceholder('Eigene Antwort...').fill('Linkes Knie')
    await page.getByRole('button', { name: 'OK' }).click()

    await expect(page.getByText('Linkes Knie')).toBeVisible()
  })

  test('maximal 2 Nachfragen werden angezeigt', async ({ page }) => {
    const event = await createTestSymptomEvent(userId, {
      raw_input: 'Schmerzen',
      status: 'extracted',
    })
    await createTestExtractedData(event.id, [
      {
        field_name: 'symptom_name',
        value: 'Schmerzen',
        confidence: 90,
      },
      { field_name: 'Körperregion', value: '?', confidence: 50 },
      { field_name: 'Seite', value: '?', confidence: 50 },
      { field_name: 'Intensität', value: '?', confidence: 50 },
    ])

    await capturePage.goto()

    // Erste Nachfrage: Körperregion (Priorität 1)
    await expect(page.getByText('Welche Region genauer?')).toBeVisible()
  })
})
