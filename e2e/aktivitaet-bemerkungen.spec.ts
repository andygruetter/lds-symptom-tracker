import { test, expect } from './fixtures/auth.fixture'
import { CapturePage } from './page-objects/capture.page'
import {
  cleanupTestData,
  createTestExtractedData,
  createTestSymptomEvent,
  getTestUserId,
} from './fixtures/test-data'

test.describe('Aktivitäts- und Bemerkungsfelder', () => {
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

  test('zeigt Aktivitäts-Sektion wenn Aktivitätsfelder vorhanden (AC 3)', async ({
    page,
  }) => {
    const event = await createTestSymptomEvent(userId, {
      raw_input: 'Kopfschmerzen während der Arbeit',
      status: 'extracted',
    })
    await createTestExtractedData(event.id, [
      { field_name: 'symptom_name', value: 'Kopfschmerzen', confidence: 95 },
      { field_name: 'body_region', value: 'Kopf', confidence: 90 },
      { field_name: 'aktivitaet_kategorie', value: 'Arbeit', confidence: 80 },
      {
        field_name: 'aktivitaet_zeitbezug',
        value: 'waehrend',
        confidence: 85,
      },
    ])

    await capturePage.goto()

    await expect(page.getByText('Aktivität')).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'aktivitaet_kategorie ändern' }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'aktivitaet_zeitbezug ändern' }),
    ).toBeVisible()
    // Medizinische Felder weiterhin sichtbar
    await expect(
      page.getByRole('button', { name: 'symptom_name ändern' }),
    ).toBeVisible()
  })

  test('zeigt keine Aktivitäts-Sektion ohne Aktivitätsfelder (AC 4)', async ({
    page,
  }) => {
    const event = await createTestSymptomEvent(userId, {
      raw_input: 'Kopfschmerzen',
      status: 'extracted',
    })
    await createTestExtractedData(event.id, [
      { field_name: 'symptom_name', value: 'Kopfschmerzen', confidence: 95 },
      { field_name: 'body_region', value: 'Kopf', confidence: 90 },
    ])

    await capturePage.goto()

    await expect(
      page.getByRole('button', { name: 'symptom_name ändern' }),
    ).toBeVisible()
    await expect(page.getByText('Aktivität')).not.toBeVisible()
  })

  test('aktivitaet_kategorie öffnet Dropdown mit 7 Kategorien (AC 5)', async ({
    page,
  }) => {
    const event = await createTestSymptomEvent(userId, {
      raw_input: 'Rückenschmerzen nach dem Sport',
      status: 'extracted',
    })
    await createTestExtractedData(event.id, [
      { field_name: 'symptom_name', value: 'Rückenschmerzen', confidence: 95 },
      {
        field_name: 'aktivitaet_kategorie',
        value: 'Sport / Bewegung',
        confidence: 80,
      },
    ])

    await capturePage.goto()

    await page
      .getByRole('button', { name: 'aktivitaet_kategorie ändern' })
      .click()
    const select = page.locator('select')
    await expect(select).toBeVisible()

    const options = select.locator('option')
    await expect(options).toHaveCount(7)
    await expect(
      options.filter({ hasText: /^Sport \/ Bewegung$/ }),
    ).toHaveCount(1)
    await expect(options.filter({ hasText: /^Arbeit$/ })).toHaveCount(1)
    await expect(options.filter({ hasText: /^Essen \/ Trinken$/ })).toHaveCount(
      1,
    )
    await expect(options.filter({ hasText: /^Schlaf \/ Ruhe$/ })).toHaveCount(1)
    await expect(options.filter({ hasText: /^Hausarbeit$/ })).toHaveCount(1)
    await expect(options.filter({ hasText: /^Freizeit$/ })).toHaveCount(1)
    await expect(options.filter({ hasText: /^Sonstiges$/ })).toHaveCount(1)
  })

  test('aktivitaet_zeitbezug öffnet Dropdown mit 3 Optionen', async ({
    page,
  }) => {
    const event = await createTestSymptomEvent(userId, {
      raw_input: 'Brustschmerzen nach dem Laufen',
      status: 'extracted',
    })
    await createTestExtractedData(event.id, [
      { field_name: 'symptom_name', value: 'Brustschmerzen', confidence: 95 },
      {
        field_name: 'aktivitaet_zeitbezug',
        value: 'nach',
        confidence: 85,
      },
    ])

    await capturePage.goto()

    await page
      .getByRole('button', { name: 'aktivitaet_zeitbezug ändern' })
      .click()
    const select = page.locator('select')
    await expect(select).toBeVisible()

    const options = select.locator('option')
    await expect(options).toHaveCount(3)
    await expect(options.filter({ hasText: 'waehrend' })).toHaveCount(1)
    await expect(options.filter({ hasText: 'nach' })).toHaveCount(1)
    await expect(options.filter({ hasText: 'vor' })).toHaveCount(1)
  })

  test('bemerkungen öffnet Textarea im Bearbeitungsmodus (AC 6)', async ({
    page,
  }) => {
    const event = await createTestSymptomEvent(userId, {
      raw_input: 'Brustschmerzen nach Hiphop tanzen',
      status: 'extracted',
    })
    await createTestExtractedData(event.id, [
      { field_name: 'symptom_name', value: 'Brustschmerzen', confidence: 95 },
      { field_name: 'bemerkungen', value: 'Hiphop tanzen', confidence: 80 },
    ])

    await capturePage.goto()

    await page.getByRole('button', { name: 'bemerkungen ändern' }).click()
    await expect(
      page.getByRole('textbox', { name: 'Bemerkungen bearbeiten' }),
    ).toBeVisible()
  })

  test('mehrere Bemerkungszeilen werden als Bullet-Liste gespeichert (AC 6)', async ({
    page,
  }) => {
    const event = await createTestSymptomEvent(userId, {
      raw_input: 'Brustschmerzen nach Sport draussen',
      status: 'extracted',
    })
    await createTestExtractedData(event.id, [
      { field_name: 'symptom_name', value: 'Brustschmerzen', confidence: 95 },
      { field_name: 'bemerkungen', value: 'Hiphop tanzen', confidence: 80 },
    ])

    await capturePage.goto()

    await page.getByRole('button', { name: 'bemerkungen ändern' }).click()
    const textarea = page.getByRole('textbox', {
      name: 'Bemerkungen bearbeiten',
    })
    await textarea.clear()
    await textarea.fill('Hiphop tanzen\nDraussen bei Kaelte')
    await textarea.blur()

    // Textarea schließt sich
    await expect(textarea).not.toBeVisible()
    // Beide Einträge als Bullet-Punkte sichtbar (nach Realtime-Update)
    await expect(page.getByText('Hiphop tanzen')).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByText('Draussen bei Kaelte')).toBeVisible({
      timeout: 10_000,
    })
  })

  test('einzelne Bemerkung wird ohne Bullet-Prefix angezeigt (AC 12)', async ({
    page,
  }) => {
    const event = await createTestSymptomEvent(userId, {
      raw_input: 'Kopfschmerzen bei Bildschirmarbeit',
      status: 'extracted',
    })
    await createTestExtractedData(event.id, [
      { field_name: 'symptom_name', value: 'Kopfschmerzen', confidence: 95 },
      { field_name: 'bemerkungen', value: 'Bildschirmarbeit', confidence: 75 },
    ])

    await capturePage.goto()

    const remarksButton = page.getByRole('button', {
      name: 'bemerkungen ändern',
    })
    await expect(remarksButton).toBeVisible()
    await expect(remarksButton).toContainText('Bildschirmarbeit')
    await expect(remarksButton).not.toContainText('- Bildschirmarbeit')
  })

  test('Escape bricht Bemerkungen-Bearbeitung ab ohne zu speichern (AC 6)', async ({
    page,
  }) => {
    const event = await createTestSymptomEvent(userId, {
      raw_input: 'Kopfschmerzen',
      status: 'extracted',
    })
    await createTestExtractedData(event.id, [
      { field_name: 'symptom_name', value: 'Kopfschmerzen', confidence: 95 },
      { field_name: 'bemerkungen', value: 'Bildschirmarbeit', confidence: 75 },
    ])

    await capturePage.goto()

    await page.getByRole('button', { name: 'bemerkungen ändern' }).click()
    const textarea = page.getByRole('textbox', {
      name: 'Bemerkungen bearbeiten',
    })
    await textarea.clear()
    await textarea.fill('Geänderter Wert')
    await textarea.press('Escape')

    // Textarea schließt sich
    await expect(textarea).not.toBeVisible()
    // Originalwert noch sichtbar
    await expect(
      page.getByRole('button', { name: 'bemerkungen ändern' }),
    ).toContainText('Bildschirmarbeit')
  })
})
