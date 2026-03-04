import { test, expect } from './fixtures/auth.fixture'
import { MorePage } from './page-objects/more.page'

test.describe('Mein Vokabular', () => {
  let morePage: MorePage

  test.beforeEach(async ({ page }) => {
    morePage = new MorePage(page)
    await morePage.goto()
  })

  test('zeigt "Mein Vokabular" Link auf der Mehr-Seite', async () => {
    await expect(morePage.vokabularLink).toBeVisible()
  })

  test('Navigation zu Vokabular-Seite', async ({ page }) => {
    await morePage.navigateToVokabular()
    await expect(page).toHaveURL('/more/vokabular')
    await expect(
      page.getByRole('heading', { name: 'Mein Vokabular' }),
    ).toBeVisible()
  })

  test('zeigt Vokabular-Inhalt oder Empty-State', async ({ page }) => {
    await morePage.navigateToVokabular()
    // Either empty state or vocabulary table should be visible
    const emptyState = page.getByText('Noch keine Begriffe gelernt')
    const vocabTable = page.getByRole('table')
    await expect(emptyState.or(vocabTable)).toBeVisible()
  })

  test('Zurück-Link führt zu /more', async ({ page }) => {
    await morePage.navigateToVokabular()
    await page
      .getByRole('link', { name: '' })
      .or(page.locator('a[href="/more"]'))
      .first()
      .click()
    await page.waitForURL('/more')
    await expect(page).toHaveURL('/more')
  })
})
