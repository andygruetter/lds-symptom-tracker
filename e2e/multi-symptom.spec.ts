import { test, expect } from './fixtures/auth.fixture'
import { CapturePage } from './page-objects/capture.page'
import {
  cleanupTestData,
  createTestExtractedData,
  createTestSymptomEvent,
  getTestUserId,
} from './fixtures/test-data'

test.describe('Multi-Symptom Extraktion', () => {
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

  test('zeigt zwei separate ReviewBubbles bei Multi-Symptom-Eingabe', async ({
    page,
  }) => {
    const rawInput = 'Kopfschmerzen und Nackenschmerzen'

    // Erstes Event (Kopfschmerzen) — wie Pipeline es erstellen wuerde
    const event1 = await createTestSymptomEvent(userId, {
      raw_input: rawInput,
      status: 'extracted',
      event_type: 'symptom',
    })
    await createTestExtractedData(event1.id, [
      { field_name: 'symptom_name', value: 'Kopfschmerzen', confidence: 95 },
      { field_name: 'body_region', value: 'Kopf', confidence: 95 },
    ])

    // Zweites Event (Nackenschmerzen) — zusaetzlich von Pipeline erstellt
    const event2 = await createTestSymptomEvent(userId, {
      raw_input: rawInput,
      status: 'extracted',
      event_type: 'symptom',
    })
    await createTestExtractedData(event2.id, [
      { field_name: 'symptom_name', value: 'Nackenschmerzen', confidence: 95 },
      { field_name: 'body_region', value: 'Nacken', confidence: 95 },
    ])

    await capturePage.goto()

    // Beide Symptome sollten als separate ReviewBubbles sichtbar sein
    const confirmButtons = page.getByRole('button', { name: /^Bestätigen$/i })
    await expect(confirmButtons).toHaveCount(2, { timeout: 15_000 })

    // Beide Symptom-Namen als SymptomTag-Buttons sichtbar
    await expect(
      page.getByRole('button', { name: 'symptom_name ändern' }).filter({ hasText: 'Kopfschmerzen' }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'symptom_name ändern' }).filter({ hasText: 'Nackenschmerzen' }),
    ).toBeVisible()
  })

  test('kann beide Symptome einzeln bestaetigen', async ({ page }) => {
    const rawInput = 'Kopfschmerzen und Nackenschmerzen'

    const event1 = await createTestSymptomEvent(userId, {
      raw_input: rawInput,
      status: 'extracted',
      event_type: 'symptom',
    })
    await createTestExtractedData(event1.id, [
      { field_name: 'symptom_name', value: 'Kopfschmerzen', confidence: 95 },
    ])

    const event2 = await createTestSymptomEvent(userId, {
      raw_input: rawInput,
      status: 'extracted',
      event_type: 'symptom',
    })
    await createTestExtractedData(event2.id, [
      { field_name: 'symptom_name', value: 'Nackenschmerzen', confidence: 95 },
    ])

    await capturePage.goto()

    // Beide ReviewBubbles warten
    const confirmButtons = page.getByRole('button', { name: /^Bestätigen$/i })
    await expect(confirmButtons).toHaveCount(2, { timeout: 15_000 })

    // Erstes Symptom bestaetigen
    await confirmButtons.first().click()
    await expect(page.getByText('Gespeichert').first()).toBeVisible({
      timeout: 10_000,
    })

    // Zweites Symptom sollte noch offen sein
    await expect(
      page.getByRole('button', { name: /^Bestätigen$/i }),
    ).toHaveCount(1)

    // Zweites bestaetigen
    await page.getByRole('button', { name: /^Bestätigen$/i }).click()
    await expect(page.getByText('Gespeichert')).toHaveCount(2, {
      timeout: 10_000,
    })
  })
})
