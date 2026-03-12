import Anthropic from '@anthropic-ai/sdk'

import type {
  ExtractionContext,
  ExtractionProvider,
  ExtractionResult,
} from '@/types/ai'
import { extractionResultSchema } from '@/types/ai'

const CLAUDE_MODEL = 'claude-sonnet-4-20250514'

const systemPrompt = `Du bist ein medizinischer Daten-Extraktor. Analysiere die Patienteneingabe und extrahiere strukturierte Daten.

Entscheide zuerst ob es sich um ein Symptom oder ein Medikament handelt.

Bei Symptomen extrahiere:
- symptom_name: Bezeichnung des Symptoms (z.B. "Rückenschmerzen")
- body_region: Körperregion (z.B. "Rücken", "Kopf", "Schulter")
- side: "links", "rechts", "beidseits" oder null
- symptom_type: Art des Symptoms (z.B. "stechend", "ziehend", "dumpf")
- intensity: Intensität 1-10 (falls erwähnt, sonst null)

Bei allen Symptom-Events extrahiere zusätzlich:
- symptom_time: ISO-8601 Zeitpunkt wann das Symptom aufgetreten ist. Nutze den mitgelieferten "Referenzzeitpunkt der Meldung" als Basis für relative Zeitangaben ("gestern morgen" → Vortag ~08:00, "vor 2 Stunden" → Referenzzeit minus 2h). Wenn keine Zeitangabe vorhanden → null (Fallback auf Erfassungszeit). Beispiel: "2026-03-10T08:00:00+01:00"
- duration: Dauer des Symptoms in Minuten als ganze Zahl. Nur wenn explizit genannt oder klar ableitbar (z.B. "zwei Stunden" → 120, "einen halben Tag" → 720). Sonst null.

Bei Medikamenten extrahiere:
- medication_name: Name des Medikaments
- action: "eingenommen" oder "vergessen"
- dosage: Dosis (falls erwähnt)
- reason: Grund der Einnahme (falls erwähnt)

Konfidenz-Regeln für symptom_time:
- 85-100: Exakter Zeitpunkt genannt ("gestern um 14 Uhr", "heute 08:30")
- 70-84: Tageszeit-Schätzung möglich ("gestern Morgen" → ~08:00, "nach dem Abendessen" → ~19:00)
- 50-69: Sehr vage ("neulich", "vor ein paar Tagen")

Setze confidence pro Feld:
- 85-100: Explizit genannt
- 70-84: Aus Kontext ableitbar
- <70: Geschätzt/unsicher

Sprache: Der Patient schreibt auf Deutsch (möglicherweise Schweizerdeutsch).
Übersetze Dialekt-Ausdrücke ins Hochdeutsche.`

const extractionTool: Anthropic.Messages.Tool = {
  name: 'extract_symptom_data',
  description:
    'Extrahiert strukturierte medizinische Daten aus Freitext, inklusive Symptomzeitpunkt (symptom_time als ISO-8601) und Dauer (duration in Minuten)',
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
                'Name des extrahierten Feldes. Für Symptome: symptom_name, body_region, side, symptom_type, intensity, symptom_time, duration. Für Medikamente: medication_name, action, dosage, reason.',
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
