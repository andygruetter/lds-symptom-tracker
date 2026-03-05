import { test, expect } from './fixtures/auth.fixture'
import { CapturePage } from './page-objects/capture.page'
import { cleanupTestData, getTestUserId } from './fixtures/test-data'

test.describe('Multi-Symptom Flow (End-to-End)', () => {
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

  test('zeigt zwei ReviewBubbles nach Eingabe von zwei Symptomen', async ({
    page,
  }) => {
    await capturePage.goto()

    // Eingabe mit zwei Symptomen absenden
    await capturePage.submitSymptom('Kopfschmerzen und Nackenschmerzen')

    // Warte auf die gesendete Nachricht
    await capturePage.waitForSentBubble('Kopfschmerzen und Nackenschmerzen')

    // Beide ReviewBubbles sollten erscheinen (Pipeline extrahiert 2 Symptome)
    const confirmButtons = page.getByRole('button', { name: /^Bestätigen$/i })
    await expect(confirmButtons).toHaveCount(2, { timeout: 45_000 })

    // Beide Symptom-Namen sollten sichtbar sein
    await expect(page.getByText('Kopfschmerzen')).toBeVisible()
    await expect(page.getByText('Nackenschmerzen')).toBeVisible()
  })

  test('kann beide Symptome einzeln bestätigen', async ({ page }) => {
    await capturePage.goto()

    await capturePage.submitSymptom('Kopfschmerzen und Nackenschmerzen')
    await capturePage.waitForSentBubble('Kopfschmerzen und Nackenschmerzen')

    // Warte bis beide ReviewBubbles da sind
    const confirmButtons = page.getByRole('button', { name: /^Bestätigen$/i })
    await expect(confirmButtons).toHaveCount(2, { timeout: 45_000 })

    // Erstes Symptom bestätigen
    await confirmButtons.first().click()
    await expect(page.getByText('Gespeichert').first()).toBeVisible({
      timeout: 10_000,
    })

    // Zweites Symptom sollte noch offen sein
    await expect(
      page.getByRole('button', { name: /^Bestätigen$/i }),
    ).toHaveCount(1)

    // Zweites bestätigen
    await page.getByRole('button', { name: /^Bestätigen$/i }).click()
    await expect(page.getByText('Gespeichert')).toHaveCount(2, {
      timeout: 10_000,
    })
  })
})
