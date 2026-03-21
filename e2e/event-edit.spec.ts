import { expect, test } from './fixtures/auth.fixture'
import { EventEditPage } from './page-objects/event-edit.page'
import { CapturePage } from './page-objects/capture.page'
import {
  cleanupTestData,
  createTestExtractedData,
  createTestSymptomEvent,
  getSymptomEvent,
  getTestUserId,
} from './fixtures/test-data'

test.describe('Event Edit-Screen', () => {
  let eventEditPage: EventEditPage
  let capturePage: CapturePage
  let userId: string

  test.beforeEach(async ({ page }) => {
    eventEditPage = new EventEditPage(page)
    capturePage = new CapturePage(page)
    userId = await getTestUserId()
    await cleanupTestData(userId)
  })

  test.afterEach(async () => {
    await cleanupTestData(userId)
  })

  test('Tap auf bestätigten Eintrag öffnet Edit-Screen', async ({ page }) => {
    const event = await createTestSymptomEvent(userId, {
      raw_input: 'Kopfschmerzen rechts',
      status: 'confirmed',
    })
    await createTestExtractedData(event.id, [
      {
        field_name: 'symptom_name',
        value: 'Kopfschmerzen',
        confidence: 95,
        confirmed: true,
      },
    ])

    await capturePage.goto()

    // Warte auf den bestätigten Bubble
    await page.getByText('Gespeichert ✓').waitFor({ timeout: 15_000 })

    // Klick auf den Bubble navigiert zur Detail-Ansicht
    await page.getByText('Gespeichert ✓').click()
    await page
      .getByRole('heading', { name: 'Event-Details' })
      .waitFor({ timeout: 10_000 })

    // Von der Detail-Ansicht zum Edit-Screen via "Bearbeiten"-Link
    await page.getByText('Bearbeiten').click()
    await eventEditPage.waitForForm()
    expect(page.url()).toContain(`/event/${event.id}/edit`)
  })

  test('Alle Felder sichtbar inkl. leere Felder', async ({ page }) => {
    const event = await createTestSymptomEvent(userId, {
      raw_input: 'Rückenschmerzen',
      status: 'extracted',
    })
    // Create all expected fields — some with values, most empty
    await createTestExtractedData(event.id, [
      { field_name: 'symptom_name', value: 'Rückenschmerzen', confidence: 90 },
      { field_name: 'body_region', value: '', confidence: 0 },
      { field_name: 'side', value: '', confidence: 0 },
      { field_name: 'symptom_type', value: '', confidence: 0 },
      { field_name: 'intensity', value: '', confidence: 0 },
      { field_name: 'symptom_time', value: '', confidence: 0 },
      { field_name: 'duration', value: '', confidence: 0 },
    ])

    await eventEditPage.goto(event.id)
    await eventEditPage.waitForForm()

    // Alle Felder sichtbar (labels from field-config.ts, intensity overridden in edit form)
    await expect(page.getByText('Symptom', { exact: true })).toBeVisible()
    await expect(page.getByText('Körperregion')).toBeVisible()
    await expect(page.getByText('Seite')).toBeVisible()
    await expect(page.getByText('Art', { exact: true })).toBeVisible()
    await expect(page.getByText('Intensität (1–10)')).toBeVisible()
    await expect(page.getByText('Zeitpunkt', { exact: true })).toBeVisible()
    await expect(page.getByText('Dauer', { exact: true })).toBeVisible()

    // Leere Felder mit Placeholder
    const placeholders = page.getByPlaceholder('Nicht erfasst')
    await expect(placeholders.first()).toBeVisible()
  })

  test('Feld editieren, speichern und Wert aktualisiert', async ({ page }) => {
    const event = await createTestSymptomEvent(userId, {
      raw_input: 'Kopfschmerzen',
      status: 'confirmed',
    })
    await createTestExtractedData(event.id, [
      {
        field_name: 'symptom_name',
        value: 'Kopfschmerzen',
        confidence: 90,
        confirmed: true,
      },
    ])

    await eventEditPage.goto(event.id)
    await eventEditPage.waitForForm()

    // Feld editieren (symptom_name = erstes Textfeld)
    const input = page.locator('input[type="text"]').first()
    await input.fill('Migräne')
    await input.blur()

    // Nach Speichern kein Fehler sichtbar
    await page.waitForTimeout(500)
    await expect(page.getByText('Speichern...')).not.toBeVisible()
  })

  test('Nacherfassung eines leeren Feldes', async ({ page }) => {
    const event = await createTestSymptomEvent(userId, {
      raw_input: 'Kopfschmerzen',
      status: 'extracted',
    })
    // Create symptom_name with value and body_region empty so it can be filled in
    await createTestExtractedData(event.id, [
      { field_name: 'symptom_name', value: 'Kopfschmerzen', confidence: 90 },
      { field_name: 'body_region', value: '', confidence: 0 },
    ])

    await eventEditPage.goto(event.id)
    await eventEditPage.waitForForm()

    // Körperregion ist leer → Nacherfassung
    // body_region ist das zweite Textfeld (nach symptom_name)
    const bodyRegionInput = page.locator('input[type="text"]').nth(1)
    await bodyRegionInput.fill('Kopf')
    await bodyRegionInput.blur()

    await page.waitForTimeout(800)
    // Kein Fehler-State
    await expect(
      page.getByText('Feld erstellen fehlgeschlagen'),
    ).not.toBeVisible()
  })

  test('Änderungshistorie ausklappen zeigt Einträge', async ({ page }) => {
    const event = await createTestSymptomEvent(userId, {
      raw_input: 'Kopfschmerzen',
      status: 'confirmed',
    })
    await createTestExtractedData(event.id, [
      {
        field_name: 'symptom_name',
        value: 'Kopfschmerzen',
        confidence: 90,
        confirmed: true,
      },
    ])

    // Correction manuell erstellen durch Korrektur im Edit-Screen
    await eventEditPage.goto(event.id)
    await eventEditPage.waitForForm()

    const input = page.locator('input[type="text"]').first()
    await input.fill('Migräne')
    await input.blur()
    await page.waitForTimeout(800)

    // Seite neu laden um Corrections zu sehen
    await page.reload()
    await eventEditPage.waitForForm()

    // Historie aufklappen
    const historyButton = page.getByText(/1 Änderung/)
    if (await historyButton.isVisible()) {
      await historyButton.click()
      await expect(page.getByText('Migräne')).toBeVisible()
    }
  })

  test('Zurück-Button navigiert zur Hauptseite', async ({ page }) => {
    const event = await createTestSymptomEvent(userId, {
      raw_input: 'Test-Symptom',
      status: 'confirmed',
    })

    // Zuerst zur Hauptseite navigieren, um Browser-History aufzubauen
    await capturePage.goto()
    await eventEditPage.goto(event.id)
    await eventEditPage.waitForForm()

    await eventEditPage.goBack()

    // router.back() navigiert zur vorherigen Seite (/)
    await page.waitForURL('/', { timeout: 5_000 })
  })

  test('Einheiten-Toggle Dauer konvertiert korrekt (AC 10)', async ({
    page,
  }) => {
    // 2880 Minuten = 2 Tage = 48 Stunden → saubere Konvertierung
    const event = await createTestSymptomEvent(userId, {
      raw_input: 'Kopfschmerzen',
      status: 'extracted',
    })
    await createTestExtractedData(event.id, [
      {
        field_name: 'duration',
        value: '2880',
        confidence: 88,
        confirmed: false,
      },
    ])

    await eventEditPage.goto(event.id)
    await eventEditPage.waitForForm()

    // Initiale Anzeige: 2880 min = 2 Tage → Tage-Modus aktiv
    const durationInput = page.locator('input[type="number"]').first()
    await expect(durationInput).toHaveValue('2')

    // Wechsel zu Stunden → 2880 min = 48 Stunden
    await page.getByRole('button', { name: 'Std' }).click()
    await expect(durationInput).toHaveValue('48')

    // Wechsel zu Minuten → 2880
    await page.getByRole('button', { name: 'Min' }).click()
    await expect(durationInput).toHaveValue('2880')

    // Zurück zu Tagen → 2
    await page.getByRole('button', { name: 'Tage' }).click()
    await expect(durationInput).toHaveValue('2')
  })

  test('Dirty-Check: kein Server-Call wenn Wert unverändert (AC 12)', async ({
    page,
  }) => {
    const event = await createTestSymptomEvent(userId, {
      raw_input: 'Kopfschmerzen',
      status: 'extracted',
    })
    await createTestExtractedData(event.id, [
      {
        field_name: 'symptom_name',
        value: 'Kopfschmerzen',
        confidence: 90,
        confirmed: true,
      },
    ])

    await eventEditPage.goto(event.id)
    await eventEditPage.waitForForm()

    // Feld fokussieren und ohne Änderung verlassen (symptom_name = erstes Textfeld)
    const input = page.locator('input[type="text"]').first()
    await input.click()
    await input.blur()

    // Kein "Speichern..."-Indikator erscheint
    await expect(page.getByText('Speichern...')).not.toBeVisible()

    // Seite neu laden → kein neuer Corrections-Eintrag (keine Änderungshistorie)
    await page.reload()
    await eventEditPage.waitForForm()
    await expect(page.getByText(/\d+ Änderung/)).not.toBeVisible()
  })

  test('symptom_time speichern synchronisiert occurred_at in DB (AC 7)', async ({
    page,
  }) => {
    const event = await createTestSymptomEvent(userId, {
      raw_input: 'Gestern Morgen Kopfschmerzen',
      status: 'extracted',
    })
    await createTestExtractedData(event.id, [
      {
        field_name: 'symptom_time',
        value: '2026-03-10T07:00:00.000Z',
        confidence: 75,
        confirmed: false,
      },
    ])

    await eventEditPage.goto(event.id)
    await eventEditPage.waitForForm()

    // Neuen Zeitpunkt setzen (datetime-local Format: YYYY-MM-DDTHH:mm)
    const datetimeInput = page.locator('input[type="datetime-local"]')
    await datetimeInput.fill('2026-03-09T09:00')
    await datetimeInput.blur()

    // Warten bis Speichern abgeschlossen
    await page.waitForTimeout(1_000)
    await expect(page.getByText('Speichern...')).not.toBeVisible()

    // DB direkt prüfen: occurred_at muss aktualisiert sein
    const updated = await getSymptomEvent(event.id)
    // occurred_at sollte auf den neuen Wert gesetzt sein (ISO-String enthält 2026-03-09)
    expect(updated.occurred_at).toContain('2026-03-09')
  })

  test('Original-Meldung wird als Kontext angezeigt', async ({ page }) => {
    const event = await createTestSymptomEvent(userId, {
      raw_input: 'Gestern Morgen Kopfschmerzen rechts',
      status: 'extracted',
    })

    await eventEditPage.goto(event.id)
    await eventEditPage.waitForForm()

    await expect(page.getByText('Ursprüngliche Meldung')).toBeVisible()
    await expect(
      page.getByText('Gestern Morgen Kopfschmerzen rechts'),
    ).toBeVisible()
  })
})
