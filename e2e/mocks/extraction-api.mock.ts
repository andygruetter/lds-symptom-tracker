import type { Page } from '@playwright/test'

export async function mockExtractionAPI(page: Page) {
  await page.route('**/api/ai/extract', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    })
  })
}

export async function mockExtractionAPIFailure(page: Page) {
  await page.route('**/api/ai/extract', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Extraktion fehlgeschlagen' }),
    })
  })
}
