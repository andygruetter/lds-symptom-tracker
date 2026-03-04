import { test, expect } from './fixtures/auth.fixture'
import { NavigationBar } from './page-objects/navigation.page'

test.describe('Insights-Seite (Auswertung)', () => {
  test('zeigt Seitenüberschrift "Auswertung"', async ({ page }) => {
    await page.goto('/insights')
    await expect(
      page.getByRole('heading', { name: 'Auswertung' }),
    ).toBeVisible()
  })

  test('Auswertung-Tab ist aktiv auf der Insights-Seite', async ({
    page,
  }) => {
    await page.goto('/insights')
    const nav = page.getByRole('navigation', { name: 'Hauptnavigation' })
    const auswertungLink = nav.locator('a[href="/insights"]')
    await expect(auswertungLink).toHaveAttribute('aria-current', 'page')
  })

  test('Navigation über Tab-Bar funktioniert', async ({ page }) => {
    await page.goto('/')
    const nav = new NavigationBar(page)
    await nav.navigateToAuswertung()
    await expect(page).toHaveURL('/insights')
    await expect(
      page.getByRole('heading', { name: 'Auswertung' }),
    ).toBeVisible()
  })
})
