/**
 * Re-Extraktions-Script: Befüllt die 3 neuen Aktivitäts-Felder für bestehende Symptom-Events.
 *
 * Ausführung: npx tsx -r tsconfig-paths/register scripts/re-extract.ts
 *
 * Benötigte Env-Variablen: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY
 */
import { createClient } from '@supabase/supabase-js'

import { claudeProvider } from '@/lib/ai/providers/claude'

const NEW_FIELDS = [
  'aktivitaet_kategorie',
  'aktivitaet_zeitbezug',
  'bemerkungen',
]

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error(
      'SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY müssen gesetzt sein',
    )
    process.exit(1)
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY muss gesetzt sein')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Load all symptom events (event_type can be 'symptom' or 'voice' after pipeline processing)
  const { data: events, error: eventsError } = await supabase
    .from('symptom_events')
    .select('id, raw_input, event_type, status')
    .in('event_type', ['symptom', 'voice'])
    .in('status', ['confirmed', 'extracted'])

  if (eventsError) {
    console.error('Fehler beim Laden der Events:', eventsError.message)
    process.exit(1)
  }

  if (!events || events.length === 0) {
    console.info('Keine Events gefunden.')
    return
  }

  const summary = {
    total: events.length,
    success: 0,
    skipped: 0,
    failed: 0,
    failedIds: [] as string[],
  }

  for (const event of events) {
    console.info(`\nVerarbeite Event ${event.id}...`)

    if (!event.raw_input) {
      console.info(`  → Übersprungen: kein raw_input`)
      summary.skipped++
      continue
    }

    // Load existing extracted_data for this event (including field values for symptom matching)
    const { data: existingData, error: dataError } = await supabase
      .from('extracted_data')
      .select('field_name, value')
      .eq('symptom_event_id', event.id)

    if (dataError) {
      console.error(`  → Fehler beim Laden der Daten: ${dataError.message}`)
      summary.failed++
      summary.failedIds.push(event.id)
      continue
    }

    const existingFieldNames = new Set(
      (existingData ?? []).map((d: { field_name: string }) => d.field_name),
    )

    // Check which new fields are missing (per-field, not per-event)
    const missingFields = NEW_FIELDS.filter((f) => !existingFieldNames.has(f))

    if (missingFields.length === 0) {
      console.info(`  → Übersprungen: alle neuen Felder bereits vorhanden`)
      summary.skipped++
      continue
    }

    // Get existing symptom_name for multi-symptom matching
    const existingSymptomName = (existingData ?? []).find(
      (d: { field_name: string; value: string }) =>
        d.field_name === 'symptom_name',
    )?.value

    try {
      // Re-extract using the same Claude prompt
      const results = await claudeProvider.extract(event.raw_input)

      // Match the correct symptom result by symptom_name (handles multi-symptom re-extraction)
      let symptomResult = existingSymptomName
        ? results.find(
            (r) =>
              r.eventType === 'symptom' &&
              r.fields.some(
                (f) =>
                  f.fieldName === 'symptom_name' &&
                  f.value === existingSymptomName,
              ),
          )
        : undefined

      // Fallback to first symptom result if no match found
      if (!symptomResult) {
        symptomResult = results.find((r) => r.eventType === 'symptom')
      }

      if (!symptomResult) {
        console.info(`  → Übersprungen: kein Symptom-Ergebnis`)
        summary.skipped++
        await sleep(1000)
        continue
      }

      // Filter only the missing new fields from the result
      const newRows = symptomResult.fields
        .filter(
          (f) =>
            missingFields.includes(f.fieldName) &&
            f.value !== null &&
            f.value !== undefined &&
            f.value.trim() !== '',
        )
        .map((f) => ({
          symptom_event_id: event.id,
          field_name: f.fieldName,
          value: f.value,
          confidence: f.confidence,
          confirmed: false,
        }))

      if (newRows.length > 0) {
        const { error: insertError } = await supabase
          .from('extracted_data')
          .insert(newRows)

        if (insertError) {
          console.error(`  → Insert-Fehler: ${insertError.message}`)
          summary.failed++
          summary.failedIds.push(event.id)
        } else {
          console.info(
            `  → ${newRows.length} neue Felder eingefügt: ${newRows.map((r) => r.field_name).join(', ')}`,
          )
          summary.success++
        }
      } else {
        console.info(
          `  → Keine neuen Felder extrahiert (Claude hat null zurückgegeben)`,
        )
        summary.success++
      }
    } catch (err) {
      console.error(
        `  → Extraktions-Fehler: ${err instanceof Error ? err.message : err}`,
      )
      summary.failed++
      summary.failedIds.push(event.id)
    }

    await sleep(1000)
  }

  console.info('\n=== Summary ===')
  console.info(`Total:    ${summary.total}`)
  console.info(`Success:  ${summary.success}`)
  console.info(`Skipped:  ${summary.skipped}`)
  console.info(`Failed:   ${summary.failed}`)
  if (summary.failedIds.length > 0) {
    console.info(`Failed IDs: ${summary.failedIds.join(', ')}`)
  }
}

main().catch((err) => {
  console.error('Unerwarteter Fehler:', err)
  process.exit(1)
})
