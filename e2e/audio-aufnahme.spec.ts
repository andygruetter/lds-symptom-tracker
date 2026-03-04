import { test, expect } from './fixtures/auth.fixture'
import { CapturePage } from './page-objects/capture.page'
import { cleanupTestData, getTestUserId } from './fixtures/test-data'

test.describe('Audio-Aufnahme (Sprachaufnahme)', () => {
  let capturePage: CapturePage
  let userId: string

  test.beforeEach(async ({ page }) => {
    capturePage = new CapturePage(page)
    userId = await getTestUserId()
    await cleanupTestData(userId)
    await capturePage.goto()
  })

  test.afterEach(async () => {
    await cleanupTestData(userId)
  })

  test('zeigt Mikrofon-Button wenn kein Text eingegeben', async ({
    page,
  }) => {
    // Without text, the mic button should be shown (not the send button)
    const micButton = page.getByRole('button', {
      name: /Sprachaufnahme starten|Mikrofon-Zugriff benötigt/,
    })
    await expect(micButton).toBeVisible()
  })

  test('Mikrofon-Button wird durch Send-Button ersetzt bei Texteingabe', async ({
    page,
  }) => {
    const micButton = page.getByRole('button', {
      name: /Sprachaufnahme starten|Mikrofon-Zugriff benötigt/,
    })
    await expect(micButton).toBeVisible()

    // Type text — send button should replace mic button
    await capturePage.textInput.fill('Kopfschmerzen')
    await expect(capturePage.sendButton).toBeVisible()
    await expect(micButton).not.toBeVisible()

    // Clear text — mic button should come back
    await capturePage.textInput.fill('')
    await expect(micButton).toBeVisible()
    await expect(capturePage.sendButton).not.toBeVisible()
  })

  // Note: Testing the full voice recording flow (hold-to-record, waveform,
  // "Sprachaufnahme wird verarbeitet..." indicator) requires MediaRecorder API
  // and event_type='voice' in the DB, which depends on migration 00008.
  // These UI interactions are covered by component-level tests.
})
