import { test, expect } from './fixtures/auth.fixture'
import { MorePage } from './page-objects/more.page'

test.describe('Mehr-Seite', () => {
  let morePage: MorePage

  test.beforeEach(async ({ page }) => {
    morePage = new MorePage(page)
    await morePage.goto()
  })

  test('zeigt Seitenüberschrift "Mehr"', async () => {
    await expect(morePage.heading).toBeVisible()
  })

  test('zeigt Bereich "Rechtliches" mit Disclaimer-Link', async ({ page }) => {
    await expect(page.getByText('Rechtliches')).toBeVisible()
    await expect(morePage.disclaimerButton).toBeVisible()
  })

  test('zeigt Bereich "Account" mit Löschen-Option', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Account' })).toBeVisible()
    await expect(morePage.deleteAccountButton).toBeVisible()
  })

  test('öffnet Disclaimer-Dialog bei Klick', async ({ page }) => {
    await morePage.openDisclaimerDialog()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(
      page.getByText('Rechtliche Hinweise zur Nutzung der App'),
    ).toBeVisible()
  })

  test('schliesst Disclaimer-Dialog mit Escape', async ({ page }) => {
    await morePage.openDisclaimerDialog()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('öffnet Account-Löschen-Dialog', async ({ page }) => {
    await morePage.openDeleteAccountDialog()
    await expect(page.getByText('Account löschen?')).toBeVisible()
    await expect(
      page.getByText('30 Tagen unwiderruflich gelöscht'),
    ).toBeVisible()
  })

  test('Abbrechen schliesst Lösch-Dialog', async ({ page }) => {
    await morePage.openDeleteAccountDialog()
    await morePage.cancelDeleteAccount()
    await expect(page.getByText('Account löschen?')).not.toBeVisible()
  })
})
