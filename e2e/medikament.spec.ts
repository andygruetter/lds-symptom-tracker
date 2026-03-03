import { test, expect } from './fixtures/auth.fixture'
import { CapturePage } from './page-objects/capture.page'
import {
  cleanupTestData,
  createTestExtractedData,
  createTestSymptomEvent,
  getTestUserId,
} from './fixtures/test-data'

test.describe('Medikamenten-Erfassung', () => {
  let capturePage: CapturePage
  let userId: string

  test.beforeEach(async ({ page }) => {
    capturePage = new CapturePage(page)
    userId = await getTestUserId()
    await cleanupTestData(userId)
  })

  test.afterEach(async () => {
    await cleanupTestData(userId)
  })

  test('zeigt Medikamenten-Bubble bei medication event_type', async ({
    page,
  }) => {
    const event = await createTestSymptomEvent(userId, {
      raw_input: 'Ibuprofen 400mg eingenommen',
      status: 'confirmed',
      event_type: 'medication',
    })
    await createTestExtractedData(event.id, [
      {
        field_name: 'medication_name',
        value: 'Ibuprofen',
        confidence: 95,
        confirmed: true,
      },
      {
        field_name: 'dosage',
        value: '400mg',
        confidence: 90,
        confirmed: true,
      },
    ])

    await capturePage.goto()

    await expect(
      page.getByText('Ibuprofen 400mg eingenommen'),
    ).toBeVisible()
    await expect(page.getByText('Gespeichert ✓')).toBeVisible()
  })

  test('zeigt ReviewBubble für extrahierte Medikamenten-Daten', async ({
    page,
  }) => {
    const event = await createTestSymptomEvent(userId, {
      raw_input: 'Paracetamol 500mg',
      status: 'extracted',
      event_type: 'medication',
    })
    await createTestExtractedData(event.id, [
      {
        field_name: 'medication_name',
        value: 'Paracetamol',
        confidence: 95,
      },
      { field_name: 'dosage', value: '500mg', confidence: 85 },
    ])

    await capturePage.goto()

    await expect(page.getByText('Paracetamol')).toBeVisible()
    await expect(page.getByText('500mg')).toBeVisible()
    await expect(
      page.getByRole('button', { name: /Bestätigen/i }),
    ).toBeVisible()
  })
})
