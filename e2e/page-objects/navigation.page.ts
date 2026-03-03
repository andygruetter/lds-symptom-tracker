import type { Locator, Page } from '@playwright/test'

export class NavigationBar {
  readonly page: Page
  readonly erfassenTab: Locator
  readonly auswertungTab: Locator
  readonly mehrTab: Locator

  constructor(page: Page) {
    const nav = page.getByRole('navigation', { name: 'Hauptnavigation' })
    this.page = page
    this.erfassenTab = nav.getByText('Erfassen')
    this.auswertungTab = nav.getByText('Auswertung')
    this.mehrTab = nav.getByText('Mehr')
  }

  async navigateToErfassen() {
    await this.erfassenTab.click()
    await this.page.waitForURL('/')
  }

  async navigateToAuswertung() {
    await this.auswertungTab.click()
    await this.page.waitForURL('/insights')
  }

  async navigateToMehr() {
    await this.mehrTab.click()
    await this.page.waitForURL('/more')
  }
}
