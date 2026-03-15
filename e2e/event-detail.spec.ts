import { test, expect } from './fixtures/auth.fixture'
import {
  cleanupTestData,
  createTestExtractedData,
  createTestSymptomEvent,
  createTestEventPhoto,
  uploadTestAudioFile,
  getTestUserId,
} from './fixtures/test-data'

test.describe('Event Detail View (Story 4.4)', () => {
  let userId: string

  test.beforeEach(async () => {
    userId = await getTestUserId()
    await cleanupTestData(userId)
  })

  test.afterEach(async () => {
    await cleanupTestData(userId)
  })

  test('Detail-Ansicht zeigt Überschrift "Event-Details"', async ({ page }) => {
    const event = await createTestSymptomEvent(userId, {
      status: 'confirmed',
      raw_input: 'Kopfschmerzen',
    })

    await page.goto(`/event/${event.id}`)
    await expect(
      page.getByRole('heading', { name: 'Event-Details' }),
    ).toBeVisible()
  })

  test('Typ-Badge zeigt "Symptom" für Symptom-Events', async ({ page }) => {
    const event = await createTestSymptomEvent(userId, {
      status: 'confirmed',
      raw_input: 'Kopfschmerzen rechts',
      event_type: 'symptom',
    })

    await page.goto(`/event/${event.id}`)
    await page.getByRole('heading', { name: 'Event-Details' }).waitFor()

    // Type badge
    await expect(page.getByText('Symptom', { exact: true })).toBeVisible()
  })

  test('Typ-Badge zeigt "Medikament" für Medikament-Events', async ({
    page,
  }) => {
    const event = await createTestSymptomEvent(userId, {
      status: 'confirmed',
      raw_input: 'Ibuprofen 400mg',
      event_type: 'medication',
    })

    await page.goto(`/event/${event.id}`)
    await page.getByRole('heading', { name: 'Event-Details' }).waitFor()

    // Type badge (also matches field label "Medikament" in extracted data section)
    await expect(
      page.getByText('Medikament', { exact: true }).first(),
    ).toBeVisible()
  })

  test('Ursprüngliche Meldung wird angezeigt', async ({ page }) => {
    const event = await createTestSymptomEvent(userId, {
      status: 'confirmed',
      raw_input: 'Gestern Abend starke Migräne rechte Seite',
    })

    await page.goto(`/event/${event.id}`)
    await page.getByRole('heading', { name: 'Event-Details' }).waitFor()

    await expect(page.getByText('Ursprüngliche Meldung')).toBeVisible()
    await expect(
      page.getByText('Gestern Abend starke Migräne rechte Seite'),
    ).toBeVisible()
  })

  test('Extrahierte Felder zeigen Labels und Werte', async ({ page }) => {
    const event = await createTestSymptomEvent(userId, {
      status: 'confirmed',
      raw_input: 'Heftige Schmerzen, einseitig',
    })
    await createTestExtractedData(event.id, [
      {
        field_name: 'symptom_name',
        value: 'Kopfschmerzen',
        confidence: 95,
        confirmed: true,
      },
      {
        field_name: 'body_region',
        value: 'Kopf',
        confidence: 88,
        confirmed: true,
      },
      {
        field_name: 'side',
        value: 'rechts',
        confidence: 82,
        confirmed: true,
      },
      {
        field_name: 'intensity',
        value: '7',
        confidence: 75,
        confirmed: true,
      },
    ])

    await page.goto(`/event/${event.id}`)
    await page.getByRole('heading', { name: 'Event-Details' }).waitFor()

    // Section heading
    await expect(
      page.getByRole('heading', { name: 'Extrahierte Daten' }),
    ).toBeVisible()

    // Field labels
    await expect(page.getByText('Symptomname')).toBeVisible()
    await expect(page.getByText('Körperregion')).toBeVisible()
    await expect(page.getByText('Seite', { exact: true })).toBeVisible()
    await expect(page.getByText('Intensität')).toBeVisible()

    // Field values
    await expect(page.getByText('Kopfschmerzen')).toBeVisible()
    await expect(page.getByText('Kopf', { exact: true })).toBeVisible()
    await expect(page.getByText('rechts')).toBeVisible()
    await expect(page.getByText('7/10')).toBeVisible()
  })

  test('Konfidenz-Dots haben korrekte title-Attribute', async ({ page }) => {
    const event = await createTestSymptomEvent(userId, {
      status: 'confirmed',
      raw_input: 'Kopfschmerzen',
    })
    await createTestExtractedData(event.id, [
      {
        field_name: 'symptom_name',
        value: 'Kopfschmerzen',
        confidence: 95,
        confirmed: true,
      },
      {
        field_name: 'body_region',
        value: 'Kopf',
        confidence: 72,
        confirmed: true,
      },
    ])

    await page.goto(`/event/${event.id}`)
    await page.getByRole('heading', { name: 'Event-Details' }).waitFor()

    // Confidence dots with title attributes
    await expect(page.locator('[title="Konfidenz: 95%"]')).toBeVisible()
    await expect(page.locator('[title="Konfidenz: 72%"]')).toBeVisible()
  })

  test('"Bearbeiten"-Link navigiert zur Edit-Seite', async ({ page }) => {
    const event = await createTestSymptomEvent(userId, {
      status: 'confirmed',
      raw_input: 'Kopfschmerzen',
      event_type: 'symptom',
    })

    await page.goto(`/event/${event.id}`)
    await page.getByRole('heading', { name: 'Event-Details' }).waitFor()

    const editLink = page.getByText('Bearbeiten')
    await expect(editLink).toBeVisible()

    await editLink.click()
    await page.waitForURL(`/event/${event.id}/edit`, { timeout: 10_000 })
    expect(page.url()).toContain(`/event/${event.id}/edit`)
  })

  test('Kein "Bearbeiten"-Link für Medikament-Events', async ({ page }) => {
    const event = await createTestSymptomEvent(userId, {
      status: 'confirmed',
      raw_input: 'Ibuprofen 400mg',
      event_type: 'medication',
    })

    await page.goto(`/event/${event.id}`)
    await page.getByRole('heading', { name: 'Event-Details' }).waitFor()

    // "Bearbeiten" should NOT be visible
    await expect(page.getByText('Bearbeiten')).not.toBeVisible()
  })

  test('Zurück-Button navigiert zurück', async ({ page }) => {
    const event = await createTestSymptomEvent(userId, {
      status: 'confirmed',
      raw_input: 'Kopfschmerzen',
    })

    // Navigate to insights first to build browser history
    await page.goto('/insights')
    await page.getByRole('heading', { name: 'Auswertung' }).waitFor()

    // Then navigate to detail
    await page.goto(`/event/${event.id}`)
    await page.getByRole('heading', { name: 'Event-Details' }).waitFor()

    // Click back button
    await page.getByRole('button', { name: 'Zurück' }).click()

    // Should navigate back to insights
    await page.waitForURL('/insights', { timeout: 10_000 })
  })

  test('Dauer wird angezeigt wenn ended_at existiert', async ({ page }) => {
    const occurredAt = '2026-03-14T08:00:00.000Z'
    const endedAt = '2026-03-14T10:30:00.000Z' // 2h 30min later

    const event = await createTestSymptomEvent(userId, {
      status: 'confirmed',
      raw_input: 'Lange Kopfschmerzen',
      occurred_at: occurredAt,
      ended_at: endedAt,
    })

    await page.goto(`/event/${event.id}`)
    await page.getByRole('heading', { name: 'Event-Details' }).waitFor()

    // Duration should be displayed
    await expect(page.getByText(/Dauer:/)).toBeVisible()
  })

  test('Audio-Sektion angezeigt wenn audio_url existiert', async ({ page }) => {
    const audioPath = `${userId}/test-audio-${Date.now()}.webm`
    await uploadTestAudioFile(audioPath)

    const event = await createTestSymptomEvent(userId, {
      status: 'confirmed',
      raw_input: 'Kopfschmerzen mit Audio',
      audio_url: audioPath,
    })

    // WebKit blocks 'load' event while fetching audio metadata — use domcontentloaded
    await page.goto(`/event/${event.id}`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'Event-Details' }).waitFor()

    // Audio section heading (has emoji prefix in component)
    await expect(page.getByText(/Audio-Aufnahme/)).toBeVisible()
  })

  test('Foto-Sektion angezeigt wenn Fotos existieren', async ({ page }) => {
    const event = await createTestSymptomEvent(userId, {
      status: 'confirmed',
      raw_input: 'Kopfschmerzen mit Foto',
    })
    await createTestEventPhoto(event.id, `${userId}/${event.id}/test-photo.jpg`)

    await page.goto(`/event/${event.id}`)
    await page.getByRole('heading', { name: 'Event-Details' }).waitFor()

    // Photo section heading with count (has emoji prefix in component)
    await expect(page.getByText(/Fotos \(1\)/)).toBeVisible()
  })

  test('Medikament-Event zeigt Medikament-Felder', async ({ page }) => {
    const event = await createTestSymptomEvent(userId, {
      status: 'confirmed',
      raw_input: 'Schmerzmittel eingenommen',
      event_type: 'medication',
    })
    await createTestExtractedData(event.id, [
      {
        field_name: 'medication',
        value: 'Ibuprofen',
        confidence: 95,
        confirmed: true,
      },
      {
        field_name: 'dosage',
        value: '400mg',
        confidence: 88,
        confirmed: true,
      },
    ])

    await page.goto(`/event/${event.id}`)
    await page.getByRole('heading', { name: 'Event-Details' }).waitFor()

    // Medication-specific field labels (badge + field label both say "Medikament")
    await expect(page.getByText('Medikament').first()).toBeVisible()
    await expect(page.getByText('Dosierung')).toBeVisible()

    // Field values
    await expect(page.getByText('Ibuprofen')).toBeVisible()
    await expect(page.getByText('400mg')).toBeVisible()
  })
})
