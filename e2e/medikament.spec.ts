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

  test('zeigt Medikamenten-Bubble bei Symptom mit medication_taken Feld', async ({
    page,
  }) => {
    const event = await createTestSymptomEvent(userId, {
      raw_input: 'Ibuprofen 400mg eingenommen',
      status: 'confirmed',
      event_type: 'symptom',
    })
    await createTestExtractedData(event.id, [
      {
        field_name: 'medication_taken',
        value: 'Ibuprofen',
        confidence: 95,
        confirmed: true,
        symptom_index: 0,
        medication_index: 0,
      },
      {
        field_name: 'medication_dosage',
        value: '400mg',
        confidence: 90,
        confirmed: true,
        symptom_index: 0,
        medication_index: 0,
      },
    ])

    await capturePage.goto()

    await expect(page.getByText('Ibuprofen 400mg eingenommen')).toBeVisible()
    await expect(page.getByText('Gespeichert ✓')).toBeVisible()
  })

  test('zeigt ReviewBubble für extrahierte Medikamenten-Daten', async ({
    page,
  }) => {
    const event = await createTestSymptomEvent(userId, {
      raw_input: 'Paracetamol 500mg',
      status: 'extracted',
      event_type: 'symptom',
    })
    await createTestExtractedData(event.id, [
      {
        field_name: 'medication_taken',
        value: 'Paracetamol',
        confidence: 95,
        symptom_index: 0,
        medication_index: 0,
      },
      {
        field_name: 'medication_dosage',
        value: '500mg',
        confidence: 85,
        symptom_index: 0,
        medication_index: 0,
      },
    ])

    await capturePage.goto()

    // MedicationGroup renders medication fields as plain text (not SymptomTag buttons)
    await expect(page.getByText('Medikamente')).toBeVisible()
    // Use regex to match the combined medication display "💊 Paracetamol · 500mg"
    await expect(page.getByText(/Paracetamol.*500mg/)).toBeVisible()
    await expect(
      page.getByRole('button', { name: /Bestätigen/i }),
    ).toBeVisible()
  })
})
