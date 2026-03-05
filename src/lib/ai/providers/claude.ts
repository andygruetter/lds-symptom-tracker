import Anthropic from '@anthropic-ai/sdk'

import type {
  ExtractionContext,
  ExtractionProvider,
  MultiExtractionResult,
} from '@/types/ai'
import { multiExtractionResultSchema } from '@/types/ai'

const CLAUDE_MODEL = 'claude-sonnet-4-20250514'

const systemPrompt = `Du bist ein medizinischer Daten-Extraktor. Analysiere die Patienteneingabe und extrahiere strukturierte Daten.

WICHTIG: Eine Eingabe kann MEHRERE Symptome oder Medikamente enthalten. Du MUSST für jedes einzelne Symptom/Medikament einen EIGENEN Eintrag im items-Array erstellen. Fasse NIEMALS verschiedene Symptome in einem einzigen Eintrag zusammen.

Beispiele für Multi-Symptom-Erkennung:
- "Kopfschmerzen und Nackenschmerzen" → 2 items (Kopfschmerzen + Nackenschmerzen)
- "Ich habe Kopfweh, mir ist übel und mein Rücken tut weh" → 3 items
- "Habe Ibuprofen genommen wegen Kopfschmerzen" → 2 items (1 Medikament + 1 Symptom)
- "Nur Kopfschmerzen" → 1 item

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
      messages: [
        {
          role: 'user',
          content: `Patienteneingabe: "${rawInput}"\n\nExtrahiere JEDEN einzelnen Symptom/Medikament-Eintrag als separates Item im items-Array. Falls mehrere Symptome oder Medikamente erwähnt werden, MUSS das items-Array mehrere Einträge enthalten.`,
        },
      ],
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
