import path from 'node:path'

import { test, expect } from './fixtures/auth.fixture'
import { CapturePage } from './page-objects/capture.page'
import { cleanupTestData, getTestUserId } from './fixtures/test-data'

test.describe('Foto-Upload', () => {
  let capturePage: CapturePage
  let userId: string

  test.beforeEach(async ({ page }) => {
    capturePage = new CapturePage(page)
    userId = await getTestUserId()
    await cleanupTestData(userId)
    await capturePage.goto()
  })

  test.afterEach(async () => {
    await cleanupTestData(userId)
  })

  test('zeigt Kamera-Button in der Input-Bar', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: 'Foto aufnehmen' }),
    ).toBeVisible()
  })

  test('zeigt verstecktes File-Input mit accept="image/*"', async ({
    page,
  }) => {
    const fileInput = page.getByLabel('Fotos hinzufügen')
    await expect(fileInput).toBeAttached()
    await expect(fileInput).toHaveAttribute('accept', 'image/*')
  })

  test('Foto-Auswahl zeigt Vorschau-Thumbnails', async ({ page }) => {
    // Create a minimal test image (1x1 pixel PNG)
    const fileInput = page.getByLabel('Fotos hinzufügen')

    await fileInput.setInputFiles({
      name: 'test-foto.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64',
      ),
    })

    // Thumbnail preview should appear
    await expect(page.getByRole('list', { name: 'Ausgewählte Fotos' })).toBeVisible()
    await expect(page.getByRole('listitem')).toBeVisible()
  })

  test('Foto kann über X-Button entfernt werden', async ({ page }) => {
    const fileInput = page.getByLabel('Fotos hinzufügen')

    await fileInput.setInputFiles({
      name: 'test-foto.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64',
      ),
    })

    await expect(page.getByRole('listitem')).toBeVisible()

    // Click the remove button
    await page
      .getByRole('button', { name: /Foto .* entfernen/ })
      .click()

    await expect(page.getByRole('list', { name: 'Ausgewählte Fotos' })).not.toBeVisible()
  })

  test('Send-Button erscheint wenn Foto ausgewählt', async ({ page }) => {
    const fileInput = page.getByLabel('Fotos hinzufügen')

    await fileInput.setInputFiles({
      name: 'test-foto.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64',
      ),
    })

    await expect(capturePage.sendButton).toBeVisible()
  })
})
