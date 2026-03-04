import { test, expect } from './fixtures/auth.fixture'
import { CapturePage } from './page-objects/capture.page'
import {
  cleanupTestData,
  createTestSymptomEvent,
  getTestUserId,
} from './fixtures/test-data'

// Requires migration 00010_transcription_status.sql to be applied
// (adds 'transcription_failed' to status CHECK constraint).
// Remove .fixme once the migration is live.
test.describe.fixme('Transkription Fehler', () => {
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

  test('zeigt Fehlermeldung bei fehlgeschlagener Transkription', async ({
    page,
  }) => {
    await createTestSymptomEvent(userId, {
      raw_input: 'Sprachaufnahme Test',
      status: 'transcription_failed',
    })

    await capturePage.goto()

    await expect(page.getByText('Transkription fehlgeschlagen')).toBeVisible()
  })

  test('zeigt "Erneut versuchen" Link bei Transkription-Fehler', async ({
    page,
  }) => {
    await createTestSymptomEvent(userId, {
      raw_input: 'Sprachaufnahme Test',
      status: 'transcription_failed',
    })

    await capturePage.goto()

    await expect(page.getByText('Erneut versuchen')).toBeVisible()
  })

  test('Retry sendet POST an /api/ai/extract', async ({ page }) => {
    const event = await createTestSymptomEvent(userId, {
      raw_input: 'Sprachaufnahme Test',
      status: 'transcription_failed',
    })

    await capturePage.goto()

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
