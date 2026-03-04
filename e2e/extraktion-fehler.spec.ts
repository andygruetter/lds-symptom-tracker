import { test, expect } from './fixtures/auth.fixture'
import { CapturePage } from './page-objects/capture.page'
import {
  cleanupTestData,
  createTestSymptomEvent,
  getTestUserId,
} from './fixtures/test-data'

test.describe('Extraktion Fehler und Retry', () => {
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

  test('zeigt Fehlermeldung bei fehlgeschlagener Extraktion', async ({
    page,
  }) => {
    await createTestSymptomEvent(userId, {
      raw_input: 'Schmerzen im Bein',
      status: 'extraction_failed',
    })

    await capturePage.goto()

    await expect(capturePage.getExtractionFailedMessage()).toBeVisible()
  })

  test('zeigt "Erneut versuchen" Link', async ({ page }) => {
    await createTestSymptomEvent(userId, {
      raw_input: 'Bauchschmerzen',
      status: 'extraction_failed',
    })

    await capturePage.goto()

    await expect(page.getByText('Erneut versuchen')).toBeVisible()
  })

  test('Retry sendet POST an /api/ai/extract', async ({ page }) => {
    const event = await createTestSymptomEvent(userId, {
      raw_input: 'Kopfschmerzen',
      status: 'extraction_failed',
    })

    await capturePage.goto()

    // Intercept the retry API call
    const retryPromise = page.waitForRequest(
      (request) =>
        request.url().includes('/api/ai/extract') &&
        request.method() === 'POST',
    )

    await capturePage.retryExtraction()

    const retryRequest = await retryPromise
    expect(retryRequest.method()).toBe('POST')
    const body = retryRequest.postDataJSON()
    expect(body.symptomEventId).toBe(event.id)
  })
})
