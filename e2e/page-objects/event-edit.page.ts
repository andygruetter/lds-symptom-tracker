import type { Locator, Page } from '@playwright/test'

export class EventEditPage {
  readonly page: Page
  readonly backButton: Locator
  readonly heading: Locator
  readonly originalMessage: Locator
  readonly correctionHistoryToggle: Locator

  constructor(page: Page) {
    this.page = page
    this.backButton = page.getByRole('button', { name: 'Zurück' })
    this.heading = page.getByRole('heading', { name: 'Symptom bearbeiten' })
    this.originalMessage = page.getByText('Ursprüngliche Meldung')
    this.correctionHistoryToggle = page.getByText(/\d+ Änderung/)
  }

  async goto(eventId: string) {
    await this.page.goto(`/event/${eventId}`)
  }

  async waitForForm() {
    await this.heading.waitFor({ timeout: 10_000 })
  }

  async editField(fieldLabel: string, newValue: string) {
    const label = this.page.getByText(fieldLabel)
    // Find the input that follows this label
    const fieldContainer = label.locator('..')
    const input = fieldContainer
      .locator('input[type="text"], input[type="number"]')
      .first()
    await input.fill(newValue)
    await input.blur()
  }

  async saveField(fieldLabel: string, newValue: string) {
    await this.editField(fieldLabel, newValue)
    // Wait for saving indicator to disappear
    await this.page.waitForTimeout(500)
  }

  async openHistory() {
    await this.correctionHistoryToggle.click()
  }

  async goBack() {
    await this.backButton.click()
  }

  getFieldInput(fieldLabel: string) {
    return this.page.getByLabel(fieldLabel)
  }
}
