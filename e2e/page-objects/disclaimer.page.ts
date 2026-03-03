import type { Locator, Page } from '@playwright/test'

export class DisclaimerPage {
  readonly page: Page
  readonly acceptButton: Locator

  constructor(page: Page) {
    this.page = page
    this.acceptButton = page.getByRole('button', {
      name: 'Ich habe den Hinweis gelesen und verstanden',
    })
  }

  async goto() {
    await this.page.goto('/disclaimer')
  }

  async accept() {
    await this.acceptButton.click()
    await this.page.waitForURL('/')
  }
}
