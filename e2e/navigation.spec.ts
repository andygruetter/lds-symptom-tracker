import { test, expect } from './fixtures/auth.fixture'
import { NavigationBar } from './page-objects/navigation.page'

test.describe('Tab-Navigation', () => {
  test('zeigt drei Tabs: Erfassen, Auswertung, Mehr', async ({ page }) => {
    await page.goto('/')
    const nav = new NavigationBar(page)
    await expect(nav.erfassenTab).toBeVisible()
    await expect(nav.auswertungTab).toBeVisible()
    await expect(nav.mehrTab).toBeVisible()
  })

  test('Erfassen-Tab ist aktiv auf der Startseite', async ({ page }) => {
    await page.goto('/')
    const erfassenLink = page
      .getByRole('navigation', { name: 'Hauptnavigation' })
      .locator('a[href="/"]')
    await expect(erfassenLink).toHaveAttribute('aria-current', 'page')
  })

  test('Navigation zu Auswertung zeigt Auswertung-Seite', async ({ page }) => {
    await page.goto('/')
    const nav = new NavigationBar(page)
    await nav.navigateToAuswertung()
    await expect(page).toHaveURL('/insights')
    await expect(
      page.getByRole('heading', { name: 'Auswertung' }),
    ).toBeVisible()
  })

  test('Navigation zu Mehr zeigt Mehr-Seite', async ({ page }) => {
    await page.goto('/')
    const nav = new NavigationBar(page)
    await nav.navigateToMehr()
    await expect(page).toHaveURL('/more')
    await expect(page.getByRole('heading', { name: 'Mehr' })).toBeVisible()
  })

  test('Navigation zurück zu Erfassen funktioniert', async ({ page }) => {
    await page.goto('/')
    const nav = new NavigationBar(page)
    await nav.navigateToAuswertung()
    await nav.navigateToErfassen()
    await expect(page).toHaveURL('/')
  })
})
