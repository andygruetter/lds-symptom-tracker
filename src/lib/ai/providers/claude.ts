import Anthropic from '@anthropic-ai/sdk'

import type {
  ExtractionContext,
  ExtractionProvider,
  MultiExtractionResult,
} from '@/types/ai'
import { multiExtractionResultSchema } from '@/types/ai'

const CLAUDE_MODEL = 'claude-sonnet-4-20250514'

const systemPrompt = `Du bist ein medizinischer Daten-Extraktor. Analysiere die Patienteneingabe und extrahiere strukturierte Daten.

WICHTIG: Eine Eingabe kann MEHRERE Symptome oder Medikamente enthalten. Erstelle für jedes einzelne Symptom/Medikament einen eigenen Eintrag im items-Array.
Beispiel: "Kopfschmerzen und Nackenschmerzen" → 2 separate items.

Entscheide pro Eintrag ob es sich um ein Symptom oder ein Medikament handelt.

Bei Symptomen extrahiere:
- symptom_name: Bezeichnung des Symptoms (z.B. "Rückenschmerzen")
- body_region: Körperregion (z.B. "Rücken", "Kopf", "Schulter")
- side: "links", "rechts", "beidseits" oder null
- symptom_type: Art des Symptoms (z.B. "stechend", "ziehend", "dumpf")
- intensity: Intensität 1-10 (falls erwähnt, sonst null)

Bei Medikamenten extrahiere:
- medication_name: Name des Medikaments
- action: "eingenommen" oder "vergessen"
- dosage: Dosis (falls erwähnt)
- reason: Grund der Einnahme (falls erwähnt)

Setze confidence pro Feld:
- 85-100: Explizit genannt
- 70-84: Aus Kontext ableitbar
- <70: Geschätzt/unsicher

Sprache: Der Patient schreibt auf Deutsch (möglicherweise Schweizerdeutsch).
Übersetze Dialekt-Ausdrücke ins Hochdeutsche.`

const extractionTool: Anthropic.Messages.Tool = {
  name: 'extract_symptom_data',
  description:
    'Extrahiert strukturierte medizinische Daten aus Freitext. Gibt ein Array von Einträgen zurück — einen pro erkanntes Symptom/Medikament.',
  input_schema: {
    type: 'object' as const,
    properties: {
      items: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
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
                    description: 'Name des extrahierten Feldes',
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
        description:
          'Array der extrahierten Einträge — ein Eintrag pro Symptom/Medikament',
      },
    },
    required: ['items'],
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
  ): Promise<MultiExtractionResult> {
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

    const parsed = multiExtractionResultSchema.safeParse(toolUse.input)

    if (!parsed.success) {
      throw new Error(`Invalid extraction result: ${parsed.error.message}`)
    }

    return parsed.data.items
  },
}
