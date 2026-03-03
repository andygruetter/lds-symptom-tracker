import type { Locator, Page } from '@playwright/test'

export class CapturePage {
  readonly page: Page
  readonly textInput: Locator
  readonly sendButton: Locator
  readonly emptyStateText: Locator
  readonly loadingText: Locator

  constructor(page: Page) {
    this.page = page
    this.textInput = page.getByPlaceholder('Symptom...')
    this.sendButton = page.getByLabel('Nachricht senden')
    this.emptyStateText = page.getByText('Beschreibe dein Symptom')
    this.loadingText = page.getByText('Wird geladen...')
  }

  async goto() {
    await this.page.goto('/')
  }

  async submitSymptom(text: string) {
    await this.textInput.fill(text)
    await this.sendButton.click()
  }

  async waitForSentBubble(text: string) {
    await this.page.getByText(text).waitFor()
  }

  async waitForProcessing() {
    await this.page.locator('.animate-pulse').first().waitFor()
  }

  async waitForReviewBubble() {
    await this.page
      .getByRole('button', { name: /^Bestätigen$/i })
      .waitFor({ timeout: 45_000 })
  }

  async confirmExtraction() {
    await this.page
      .getByRole('button', { name: /^Bestätigen$/i })
      .click()
  }

  async waitForConfirmed() {
    await this.page.getByText('Gespeichert ✓').waitFor()
  }

  async endSymptom() {
    await this.page
      .getByRole('button', { name: 'Symptom beendet' })
      .click()
  }

  async waitForEndedMessage() {
    await this.page.getByText(/Symptom beendet — Dauer:/).waitFor()
  }

  async retryExtraction() {
    await this.page.getByText('Erneut versuchen').click()
  }

  getExtractionFailedMessage() {
    return this.page.getByText('Extraktion fehlgeschlagen')
  }

  async answerClarification(optionText: string) {
    await this.page.getByRole('button', { name: optionText }).click()
  }
}
