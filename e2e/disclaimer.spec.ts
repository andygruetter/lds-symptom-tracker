import { test, expect } from './fixtures/auth.fixture'
import { DisclaimerPage } from './page-objects/disclaimer.page'

test.describe('Disclaimer-Flow', () => {
  test('zeigt Disclaimer-Seite mit Akzeptieren-Button', async ({ page }) => {
    const disclaimerPage = new DisclaimerPage(page)
    await disclaimerPage.goto()
    await expect(disclaimerPage.acceptButton).toBeVisible()
    await expect(disclaimerPage.acceptButton).toHaveText(
      'Ich habe den Hinweis gelesen und verstanden',
    )
  })

  test('Akzeptieren leitet zur Startseite weiter', async ({ page }) => {
    const disclaimerPage = new DisclaimerPage(page)
    await disclaimerPage.goto()
    await disclaimerPage.accept()
    await expect(page).toHaveURL('/')
  })

  test('zeigt "Wird gespeichert..." während Verarbeitung', async ({ page }) => {
    const disclaimerPage = new DisclaimerPage(page)
    await disclaimerPage.goto()
    await disclaimerPage.acceptButton.click()
    await expect(page.getByText('Wird gespeichert...')).toBeVisible()
  })
})
