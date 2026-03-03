import { test as setup } from '@playwright/test'

const TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? 'e2e-test@test.com'
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD ?? 'e2e-test-password-123'

const authFile = 'e2e/.auth/user.json'

setup('Authentifizierung via Dev-Login', async ({ page }) => {
  await page.goto('/auth/dev-login')
  await page.getByPlaceholder('Email').fill(TEST_EMAIL)
  await page.getByPlaceholder('Passwort').fill(TEST_PASSWORD)
  await page.getByRole('button', { name: 'Anmelden' }).click()
  await page.waitForURL('/')
  await page.context().storageState({ path: authFile })
})
