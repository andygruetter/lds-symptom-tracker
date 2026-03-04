import { expect, test } from '@playwright/test'

test.describe('Authentifizierung', () => {
  test('zeigt Login-Seite mit Apple Sign-In Button', async ({ page }) => {
    await page.goto('/auth/login')
    await expect(page.getByText('LDS Symptom Tracker')).toBeVisible()
    await expect(page.getByText('Symptom-Tracking für Patienten')).toBeVisible()
    await expect(page.getByRole('button', { name: /Apple/ })).toBeVisible()
  })

  test('zeigt Fehlermeldung bei ungültigem Callback', async ({ page }) => {
    await page.goto('/auth/login?error=callback')
    await expect(page.getByText('Anmeldung fehlgeschlagen')).toBeVisible()
  })

  test('Dev-Login: erfolgreiche Anmeldung leitet zur Startseite weiter', async ({
    page,
  }) => {
    await page.goto('/auth/dev-login')
    await page
      .getByPlaceholder('Email')
      .fill(process.env.E2E_TEST_EMAIL ?? 'e2e-test@test.com')
    await page
      .getByPlaceholder('Passwort')
      .fill(process.env.E2E_TEST_PASSWORD ?? 'e2e-test-password-123')
    await page.getByRole('button', { name: 'Anmelden' }).click()
    await page.waitForURL('/')
    await expect(page).toHaveURL('/')
  })

  test('Dev-Login: zeigt Fehler bei falschem Passwort', async ({ page }) => {
    await page.goto('/auth/dev-login')
    await page.getByPlaceholder('Passwort').fill('falsches-passwort')
    await page.getByRole('button', { name: 'Anmelden' }).click()
    await expect(page.locator('.text-destructive')).toBeVisible()
  })
})
