import type { Locator, Page } from '@playwright/test'

export class MorePage {
  readonly page: Page
  readonly heading: Locator
  readonly disclaimerButton: Locator
  readonly signOutButton: Locator
  readonly deleteAccountButton: Locator
  readonly vokabularLink: Locator

  constructor(page: Page) {
    this.page = page
    this.heading = page.getByRole('heading', { name: 'Mehr' })
    this.disclaimerButton = page.getByText('Disclaimer anzeigen')
    this.signOutButton = page.getByText('Abmelden')
    this.deleteAccountButton = page.getByText('Account löschen')
    this.vokabularLink = page.getByText('Mein Vokabular')
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

  async signOut() {
    await this.signOutButton.click()
  }

  async navigateToVokabular() {
    await this.vokabularLink.click()
    await this.page.waitForURL('/more/vokabular')
  }
}
