import type { Locator, Page } from '@playwright/test'

export class MorePage {
  readonly page: Page
  readonly heading: Locator
  readonly disclaimerButton: Locator
  readonly deleteAccountButton: Locator

  constructor(page: Page) {
    this.page = page
    this.heading = page.getByRole('heading', { name: 'Mehr' })
    this.disclaimerButton = page.getByText('Disclaimer anzeigen')
    this.deleteAccountButton = page.getByText('Account löschen')
  }

  async goto() {
    await this.page.goto('/more')
  }

  async openDisclaimerDialog() {
    await this.disclaimerButton.click()
    await this.page.getByRole('dialog').waitFor()
  }

  async openDeleteAccountDialog() {
    await this.deleteAccountButton.click()
    await this.page.getByText('Account löschen?').waitFor()
  }

  async cancelDeleteAccount() {
    await this.page.getByRole('button', { name: 'Abbrechen' }).click()
  }
}
