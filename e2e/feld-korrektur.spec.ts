import { test, expect } from './fixtures/auth.fixture'
import { CapturePage } from './page-objects/capture.page'
import {
  cleanupTestData,
  createTestExtractedData,
  createTestSymptomEvent,
  getTestUserId,
} from './fixtures/test-data'

test.describe('Feld-Korrektur', () => {
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

  test('Ändern-Button öffnet Bearbeitungsmodus', async ({ page }) => {
    const event = await createTestSymptomEvent(userId, {
      raw_input: 'Kopfschmerzen',
      status: 'extracted',
    })
    await createTestExtractedData(event.id, [
      {
        field_name: 'symptom_name',
        value: 'Kopfschmerzen',
        confidence: 80,
      },
    ])

    await capturePage.goto()
    await page.getByRole('button', { name: 'Ändern', exact: true }).click()

    // Im Bearbeitungsmodus sollte ein Input-Feld erscheinen
    await expect(page.locator('input[type="text"]').last()).toBeVisible()
  })

  test('korrigierter Wert wird gespeichert', async ({ page }) => {
    const event = await createTestSymptomEvent(userId, {
      raw_input: 'Schmerzen im Arm',
      status: 'extracted',
    })
    await createTestExtractedData(event.id, [
      { field_name: 'symptom_name', value: 'Armschmerzen', confidence: 80 },
      { field_name: 'Körperregion', value: 'Arm', confidence: 90 },
    ])

    await capturePage.goto()
    await page.getByRole('button', { name: 'symptom_name ändern' }).click()

    const editInput = page.locator('input[type="text"]').last()
    await editInput.fill('Schulterschmerzen')
    await editInput.press('Enter')

    await expect(page.getByText('Schulterschmerzen')).toBeVisible()
  })

  test('Escape bricht Bearbeitung ab', async ({ page }) => {
    const event = await createTestSymptomEvent(userId, {
      raw_input: 'Kopfweh',
      status: 'extracted',
    })
    await createTestExtractedData(event.id, [
      {
        field_name: 'symptom_name',
        value: 'Kopfschmerzen',
        confidence: 75,
      },
    ])

    await capturePage.goto()
    await page.getByRole('button', { name: 'symptom_name ändern' }).click()

    const editInput = page.locator('input[type="text"]').last()
    await editInput.fill('Neuer Wert')
    await editInput.press('Escape')

    await expect(page.getByText('Kopfschmerzen')).toBeVisible()
  })
})
