import Anthropic from '@anthropic-ai/sdk'

import type {
  ExtractionContext,
  ExtractionProvider,
  ExtractionResult,
} from '@/types/ai'
import { extractionResultSchema } from '@/types/ai'

const CLAUDE_MODEL = 'claude-sonnet-4-20250514'

// Standardisierte Taxonomie für konsistente Extraktion
const SYMPTOM_TAXONOMY = {
  symptomNames: [
    'Kopfschmerzen',
    'Migräne',
    'Rückenschmerzen',
    'Nackenschmerzen',
    'Schulterschmerzen',
    'Gelenkschmerzen',
    'Bauchschmerzen',
    'Brustschmerzen',
    'Schwindel',
    'Übelkeit',
    'Erbrechen',
    'Müdigkeit',
    'Erschöpfung',
    'Schlafstörungen',
    'Herzrhythmusstörungen',
    'Herzrasen',
    'Atemnot',
    'Husten',
    'Halsschmerzen',
    'Ohrenschmerzen',
    'Augenschmerzen',
    'Zahnschmerzen',
    'Fieber',
    'Schüttelfrost',
    'Hautausschlag',
    'Juckreiz',
    'Taubheitsgefühl',
    'Kribbeln',
    'Verstopfung',
    'Durchfall',
    'Sodbrennen',
    'Blähungen',
  ],
  // Synonym → kanonischer Term: Verschiedene Bezeichnungen auf einen einheitlichen Wert normalisieren
  synonyms: [
    ['Rhythmusstörungen', 'Herzrhythmusstörungen'],
    ['Arrhythmie', 'Herzrhythmusstörungen'],
    ['Herzstolpern', 'Herzrhythmusstörungen'],
    ['Palpitationen', 'Herzrasen'],
    ['Herzklopfen', 'Herzrasen'],
    ['Cephalgie', 'Kopfschmerzen'],
    ['Kopfweh', 'Kopfschmerzen'],
    ['Bauchweh', 'Bauchschmerzen'],
    ['Magenschmerzen', 'Bauchschmerzen'],
    ['Brechreiz', 'Übelkeit'],
    ['Schlaflosigkeit', 'Schlafstörungen'],
    ['Insomnie', 'Schlafstörungen'],
    ['Vertigo', 'Schwindel'],
    ['Benommenheit', 'Schwindel'],
    ['Luftnot', 'Atemnot'],
    ['Kurzatmigkeit', 'Atemnot'],
    ['Obstipation', 'Verstopfung'],
    ['Diarrhö', 'Durchfall'],
    ['Reflux', 'Sodbrennen'],
    ['Pruritus', 'Juckreiz'],
    ['Exanthem', 'Hautausschlag'],
    ['Parästhesie', 'Kribbeln'],
    ['Fatigue', 'Erschöpfung'],
    ['Abgeschlagenheit', 'Erschöpfung'],
    ['Mattigkeit', 'Müdigkeit'],
  ],
  bodyRegions: [
    'Kopf',
    'Stirn',
    'Schläfe',
    'Hinterkopf',
    'Scheitel',
    'Nacken',
    'Halswirbelsäule',
    'Schulter',
    'Oberarm',
    'Unterarm',
    'Hand',
    'Finger',
    'oberer Rücken',
    'unterer Rücken',
    'Lendenbereich',
    'Brustwirbelsäule',
    'Brust',
    'Bauch',
    'Oberbauch',
    'Unterbauch',
    'Hüfte',
    'Leiste',
    'Oberschenkel',
    'Knie',
    'Unterschenkel',
    'Wade',
    'Fuss',
    'Zehen',
    'Auge',
    'Ohr',
    'Kiefer',
    'Hals',
  ],
  symptomTypes: [
    'stechend',
    'ziehend',
    'dumpf',
    'brennend',
    'kribbelnd',
    'pochend',
    'pulsierend',
    'drückend',
    'krampfartig',
    'schneidend',
    'bohrend',
    'wellenförmig',
  ],
}

const systemPrompt = `Du bist ein medizinischer Daten-Extraktor. Analysiere die Patienteneingabe und extrahiere strukturierte Daten.

## Schritt 1: Event-Typ bestimmen
Entscheide ob es sich um ein Symptom oder ein Medikament handelt.

## Schritt 2: Felder extrahieren

### Bei Symptomen extrahiere:
- symptom_name: Standardisierter Name. Bevorzuge diese Begriffe: ${SYMPTOM_TAXONOMY.symptomNames.join(', ')}

## Synonym-Normalisierung
WICHTIG: Verwende IMMER den kanonischen Begriff, auch wenn der Patient ein Synonym verwendet:
${SYMPTOM_TAXONOMY.synonyms.map(([from, to]) => `- "${from}" → "${to}"`).join('\n')}
- body_region: Körperregion. Bevorzuge diese Begriffe: ${SYMPTOM_TAXONOMY.bodyRegions.join(', ')}
- side: "links", "rechts", "beidseits" oder null
- symptom_type: Art des Symptoms. Bevorzuge: ${SYMPTOM_TAXONOMY.symptomTypes.join(', ')}
- intensity: Intensität 1-10 (falls erwähnt, sonst null)
- symptom_time: ISO-8601 Zeitpunkt wann das Symptom aufgetreten ist. Nutze den mitgelieferten "Referenzzeitpunkt der Meldung" als Basis für relative Zeitangaben ("gestern morgen" → Vortag ~08:00, "vor 2 Stunden" → Referenzzeit minus 2h). Wenn keine Zeitangabe vorhanden → null (Fallback auf Erfassungszeit). Beispiel: "2026-03-10T08:00:00+01:00"
- duration: Dauer in Minuten als ganze Zahl. Nur wenn explizit genannt oder klar ableitbar (z.B. "zwei Stunden" → 120). Sonst null.
- status: Aktueller Symptom-Status. Nur setzen wenn aus dem Text ableitbar:
  - "active" — Symptom ist aktuell vorhanden (Standard wenn nichts anderes erkennbar)
  - "resolved" — Symptom ist vorbei ("kein X mehr", "X ist weg", "X hat aufgehört")
  - "improving" — Symptom wird besser ("X wird besser", "X lässt nach")
  - "worsening" — Symptom verschlechtert sich ("X wird schlimmer", "X nimmt zu")
  Null wenn nicht bestimmbar.
- trigger: Auslöser oder Kontext ("nach dem Sport", "bei Stress", "nach dem Essen", "beim Aufstehen"). Null wenn nicht erwähnt.
- frequency: Häufigkeitsmuster ("erstmalig", "täglich", "gelegentlich", "jede Nacht", "seit 3 Wochen"). Null wenn nicht erwähnt.

### Bei Medikamenten extrahiere:
- medication_name: Name des Medikaments
- action: "eingenommen" oder "vergessen"
- dosage: Dosis (falls erwähnt)
- reason: Grund der Einnahme (falls erwähnt)

## Negationen und Status erkennen
WICHTIG: Erkenne ob der Patient über ein AKTUELLES oder VERGANGENES Symptom spricht:
- "Ich habe Kopfschmerzen" → status: "active"
- "Meine Kopfschmerzen sind weg" → status: "resolved"
- "Kein Schwindel mehr seit heute Morgen" → status: "resolved"
- "Die Rückenschmerzen werden langsam besser" → status: "improving"
- "Wird immer schlimmer" → status: "worsening"
Bei "resolved" extrahiere trotzdem alle Felder — der Status zeigt an, dass es vorbei ist.

## Mehrere Symptome
Wenn der Patient MEHRERE Symptome in einer Eingabe beschreibt (z.B. "Kopfweh und Übelkeit"):
- Extrahiere JEDES Symptom als eigene Feld-Gruppe
- Verwende symptomIndex 0 für das Hauptsymptom, 1 für das zweite, 2 für das dritte usw.
- Jedes Symptom bekommt seine eigenen Felder (symptom_name, body_region, etc.)

## Konfidenz-Regeln

Für symptom_time:
- 85-100: Exakter Zeitpunkt ("gestern um 14 Uhr", "heute 08:30")
- 70-84: Tageszeit-Schätzung ("gestern Morgen" → ~08:00, "nach dem Abendessen" → ~19:00)
- 50-69: Sehr vage ("neulich", "vor ein paar Tagen")

Für alle anderen Felder:
- 85-100: Explizit genannt
- 70-84: Aus Kontext ableitbar
- <70: Geschätzt/unsicher

## Beispiele

Eingabe: "Referenzzeitpunkt der Meldung: 2026-03-10T14:30:00+01:00\\n\\nHab seit gestern Morgen so ein Stechen im unteren Rücken links, so 6 von 10"
→ eventType: "symptom", symptomIndex: 0
  - symptom_name: "Rückenschmerzen" (95)
  - body_region: "unterer Rücken" (95)
  - side: "links" (95)
  - symptom_type: "stechend" (90)
  - intensity: "6" (95)
  - symptom_time: "2026-03-09T08:00:00+01:00" (75)
  - status: "active" (90)

Eingabe: "Referenzzeitpunkt der Meldung: 2026-03-10T20:00:00+01:00\\n\\nKopfweh und Übelkeit nach dem Joggen, wird schlimmer"
→ eventType: "symptom"
  symptomIndex 0:
  - symptom_name: "Kopfschmerzen" (95)
  - body_region: "Kopf" (90)
  - symptom_type: null
  - status: "worsening" (85)
  - trigger: "nach dem Joggen" (90)
  symptomIndex 1:
  - symptom_name: "Übelkeit" (90)
  - status: "worsening" (75)
  - trigger: "nach dem Joggen" (85)

Eingabe: "Referenzzeitpunkt der Meldung: 2026-03-10T09:00:00+01:00\\n\\nMeine Rückenschmerzen sind seit heute Morgen weg"
→ eventType: "symptom", symptomIndex: 0
  - symptom_name: "Rückenschmerzen" (95)
  - body_region: "Rücken" (80)
  - status: "resolved" (95)
  - symptom_time: "2026-03-10T07:00:00+01:00" (70)

Eingabe: "Hab um 8 Ibuprofen 400 genommen gegen die Kopfschmerzen"
→ eventType: "medication"
  - medication_name: "Ibuprofen" (95)
  - action: "eingenommen" (95)
  - dosage: "400mg" (90)
  - reason: "Kopfschmerzen" (90)

Sprache: Der Patient schreibt auf Deutsch (möglicherweise Schweizerdeutsch).
Übersetze Dialekt-Ausdrücke ins Hochdeutsche.`

const extractionTool: Anthropic.Messages.Tool = {
  name: 'extract_symptom_data',
  description:
    'Extrahiert strukturierte medizinische Daten aus Freitext. Unterstützt mehrere Symptome pro Eingabe via symptomIndex.',
  input_schema: {
    type: 'object' as const,
    properties: {
      eventType: {
        type: 'string',
        enum: ['symptom', 'medication'],
        description: 'Art des Events: Symptom oder Medikament',
      },
      fields: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            fieldName: {
              type: 'string',
              description:
                'Name des extrahierten Feldes. Für Symptome: symptom_name, body_region, side, symptom_type, intensity, symptom_time, duration, status, trigger, frequency. Für Medikamente: medication_name, action, dosage, reason.',
            },
            value: {
              type: 'string',
              description: 'Extrahierter Wert',
            },
            confidence: {
              type: 'number',
              minimum: 0,
              maximum: 100,
              description: 'Konfidenz-Score 0-100',
            },
            symptomIndex: {
              type: 'integer',
              minimum: 0,
              description:
                'Index des Symptoms bei Multi-Symptom-Eingaben. 0 = Hauptsymptom (Standard), 1+ = weitere Symptome.',
              default: 0,
            },
          },
          required: ['fieldName', 'value', 'confidence'],
        },
        description: 'Array der extrahierten Felder',
      },
    },
    required: ['eventType', 'fields'],
  },
}

function createClient(): Anthropic {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })
}

export const claudeProvider: ExtractionProvider = {
  async extract(
    rawInput: string,
    context?: ExtractionContext,
  ): Promise<ExtractionResult> {
    const client = createClient()

    const contextParts = [context?.corrections, context?.vocabulary].filter(
      Boolean,
    )

    const fullSystemPrompt =
      contextParts.length > 0
        ? `${systemPrompt}\n\n${contextParts.join('\n\n')}`
        : systemPrompt

    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system: fullSystemPrompt,
      tools: [extractionTool],
      tool_choice: { type: 'tool', name: 'extract_symptom_data' },
      messages: [{ role: 'user', content: rawInput }],
    })

    const toolUse = response.content.find(
      (block): block is Anthropic.Messages.ToolUseBlock =>
        block.type === 'tool_use',
    )

    if (!toolUse) {
      throw new Error('Claude returned no tool use response')
    }

    const parsed = extractionResultSchema.safeParse(toolUse.input)

    if (!parsed.success) {
      throw new Error(`Invalid extraction result: ${parsed.error.message}`)
    }

    return parsed.data
  },
}
