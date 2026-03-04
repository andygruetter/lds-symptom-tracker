import { test, expect } from './fixtures/auth.fixture'
import { CapturePage } from './page-objects/capture.page'
import { cleanupTestData, getTestUserId } from './fixtures/test-data'

test.describe('Symptom-Erfassung', () => {
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

  test('zeigt leeren Zustand mit Hinweistext', async () => {
    await capturePage.goto()
    await expect(capturePage.emptyStateText).toBeVisible()
  })

  test('zeigt Textarea mit Placeholder', async () => {
    await capturePage.goto()
    await expect(capturePage.textInput).toBeVisible()
    await expect(capturePage.textInput).toHaveAttribute(
      'placeholder',
      /Symptom/,
    )
  })

  test('zeigt Send-Button erst bei Texteingabe', async () => {
    await capturePage.goto()
    await expect(capturePage.sendButton).not.toBeVisible()
    await capturePage.textInput.fill('Kopfschmerzen')
    await expect(capturePage.sendButton).toBeVisible()
  })

  test('sendet Symptom und zeigt Chat-Bubble', async ({ page }) => {
    await capturePage.goto()
    await capturePage.submitSymptom('Kopfschmerzen rechts stechend')
    // Wait for the sent bubble to appear (optimistic update + server roundtrip)
    await capturePage.waitForSentBubble('Kopfschmerzen rechts stechend')
    await expect(page.getByText('Kopfschmerzen rechts stechend')).toBeVisible()
  })

  test('leert Eingabefeld nach dem Senden', async () => {
    await capturePage.goto()
    await capturePage.submitSymptom('Kopfschmerzen')
    await expect(capturePage.textInput).toHaveValue('')
  })

  test('zeigt Verarbeitungs-Indikator oder ReviewBubble nach dem Senden', async ({
    page,
  }) => {
    await capturePage.goto()
    await capturePage.submitSymptom('Starke Kopfschmerzen')
    // With mock extraction, processing may complete instantly.
    // Either the processing dots or the ReviewBubble should appear.
    await expect(
      page
        .locator('.animate-pulse')
        .first()
        .or(page.getByRole('button', { name: /Bestätigen/i })),
    ).toBeVisible({ timeout: 15_000 })
  })

  test('zeigt Zeitstempel an der Chat-Bubble', async ({ page }) => {
    await capturePage.goto()
    await capturePage.submitSymptom('Rückenschmerzen')
    await capturePage.waitForSentBubble('Rückenschmerzen')
    // Timestamp should show current time (HH:MM format)
    await expect(page.getByText(/\d{1,2}:\d{2}/)).toBeVisible()
  })
})
