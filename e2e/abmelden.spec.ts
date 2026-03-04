import { test, expect } from './fixtures/auth.fixture'
import { MorePage } from './page-objects/more.page'

const TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? 'e2e-test@test.com'
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD ?? 'e2e-test-password-123'

test.describe('Abmelden (Sign Out)', () => {
  let morePage: MorePage

  test.beforeEach(async ({ page }) => {
    morePage = new MorePage(page)
    await morePage.goto()
  })

  test('zeigt Abmelden-Button in der Account-Sektion', async () => {
    await expect(morePage.signOutButton).toBeVisible()
  })

  test('Abmelden-Button erscheint vor Account-löschen', async ({ page }) => {
    const signOutBox = await morePage.signOutButton.boundingBox()
    const deleteBox = await morePage.deleteAccountButton.boundingBox()

    expect(signOutBox).toBeTruthy()
    expect(deleteBox).toBeTruthy()
    // "Abmelden" should be above "Account löschen" (smaller Y)
    expect(signOutBox!.y).toBeLessThan(deleteBox!.y)
  })

  test('Klick auf Abmelden leitet zu Login weiter', async ({ page }) => {
    await morePage.signOut()
    await page.waitForURL(/\/auth\/login/, { timeout: 15_000 })
    await expect(page).toHaveURL(/\/auth\/login/)

    // Re-authenticate so subsequent tests in the suite keep working
    await page.goto('/auth/dev-login')
    await page.getByPlaceholder('Email').fill(TEST_EMAIL)
    await page.getByPlaceholder('Passwort').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Anmelden' }).click()
    await page.waitForURL('/')
    await page.context().storageState({ path: 'e2e/.auth/user.json' })
  })
})
