import type { Locator, Page } from '@playwright/test'

export class EventDetailPage {
  readonly page: Page
  readonly heading: Locator
  readonly backButton: Locator
  readonly deleteButton: Locator
  readonly editLink: Locator

  constructor(page: Page) {
    this.page = page
    this.heading = page.getByRole('heading', { name: 'Event-Details' })
    this.backButton = page.getByRole('button', { name: 'Zurück' })
    this.deleteButton = page.getByRole('button', { name: 'Event löschen' })
    this.editLink = page.getByRole('link', { name: 'Bearbeiten' })
  }

  async goto(eventId: string) {
    await this.page.goto(`/event/${eventId}`)
  }

  async waitForLoaded() {
    await this.heading.waitFor({ timeout: 10_000 })
  }

  async goBack() {
    await this.backButton.click()
  }

  /** Returns the type badge (Symptom / Medikament) */
  getTypeBadge(type: 'Symptom' | 'Medikament') {
    return this.page.locator('span', { hasText: type }).first()
  }

  /** Returns the date/time text element */
  getDateTime() {
    return this.page.locator('span').filter({ hasText: /\d{2}\.\d{2}\.\d{4}/ })
  }

  /** Returns the "Ursprüngliche Meldung" section */
  getRawInputSection() {
    return this.page.getByText('Ursprüngliche Meldung')
  }

  /** Returns the raw input text content */
  getRawInputText() {
    return this.page
      .getByText('Ursprüngliche Meldung')
      .locator('..')
      .locator('p')
      .last()
  }

  /** Returns the audio section label */
  getAudioSection() {
    return this.page.getByText('Audio-Aufnahme')
  }

  /** Returns the photo section label */
  getPhotoSection() {
    return this.page.getByText(/Fotos/)
  }

  /** Returns the "Extrahierte Daten" heading */
  getExtractedDataHeading() {
    return this.page.getByRole('heading', { name: 'Extrahierte Daten' })
  }

  /** Returns the value text for a specific extracted data field label */
  getExtractedFieldValue(fieldLabel: string) {
    return this.page
      .locator('div')
      .filter({ hasText: fieldLabel })
      .locator('span')
      .last()
  }

  // --- Delete dialog ---

  async openDeleteDialog() {
    await this.deleteButton.click()
    await this.getDeleteDialogTitle().waitFor()
  }

  getDeleteDialogTitle() {
    return this.page.getByText('Event löschen?')
  }

  getDeleteConfirmButton() {
    return this.page.getByRole('button', { name: 'Ja, Event löschen' })
  }

  getDeleteCancelButton() {
    return this.page.getByRole('button', { name: 'Abbrechen' })
  }

  async confirmDelete() {
    await this.getDeleteConfirmButton().click()
  }

  async cancelDelete() {
    await this.getDeleteCancelButton().click()
  }

  // --- Edit navigation ---

  async navigateToEdit() {
    await this.editLink.click()
    await this.page.waitForURL(/\/event\/.*\/edit/)
  }
}
