import { test, expect } from './fixtures/auth.fixture'
import { CapturePage } from './page-objects/capture.page'
import {
  cleanupTestData,
  createTestExtractedData,
  createTestSymptomEvent,
  getTestUserId,
} from './fixtures/test-data'

test.describe('Symptom beenden', () => {
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

  test('zeigt "Symptom beendet" Button bei aktivem bestätigtem Symptom', async ({
    page,
  }) => {
    const event = await createTestSymptomEvent(userId, {
      raw_input: 'Kopfschmerzen rechts',
      status: 'confirmed',
      ended_at: null,
    })
    await createTestExtractedData(event.id, [
      {
        field_name: 'symptom_name',
        value: 'Kopfschmerzen',
        confidence: 95,
        confirmed: true,
      },
    ])

    await capturePage.goto()

    await expect(
      page.getByRole('button', { name: 'Symptom beendet' }),
    ).toBeVisible()
  })

  test('zeigt "Aktiv seit..." Badge bei aktivem Symptom', async ({
    page,
  }) => {
    const event = await createTestSymptomEvent(userId, {
      raw_input: 'Kopfschmerzen',
      status: 'confirmed',
      ended_at: null,
    })
    await createTestExtractedData(event.id, [
      {
        field_name: 'symptom_name',
        value: 'Kopfschmerzen',
        confidence: 95,
        confirmed: true,
      },
    ])

    await capturePage.goto()

    await expect(page.getByText(/Aktiv seit|Seit \d/)).toBeVisible()
  })

  test('Beenden setzt ended_at und zeigt Dauer-Meldung', async ({
    page,
  }) => {
    const event = await createTestSymptomEvent(userId, {
      raw_input: 'Rückenschmerzen',
      status: 'confirmed',
      ended_at: null,
    })
    await createTestExtractedData(event.id, [
      {
        field_name: 'symptom_name',
        value: 'Rückenschmerzen',
        confidence: 95,
        confirmed: true,
      },
    ])

    await capturePage.goto()
    await capturePage.endSymptom()
    await capturePage.waitForEndedMessage()

    await expect(
      page.getByRole('button', { name: 'Symptom beendet' }),
    ).not.toBeVisible()
  })

  test('zeigt Dauer-Label bei bereits beendetem Symptom', async ({
    page,
  }) => {
    const createdAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    const endedAt = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()

    const event = await createTestSymptomEvent(userId, {
      raw_input: 'Kopfschmerzen',
      status: 'confirmed',
      created_at: createdAt,
      ended_at: endedAt,
    })
    await createTestExtractedData(event.id, [
      {
        field_name: 'symptom_name',
        value: 'Kopfschmerzen',
        confidence: 95,
        confirmed: true,
      },
    ])

    await capturePage.goto()

    await expect(page.getByText(/Dauer:/).first()).toBeVisible()
  })
})
