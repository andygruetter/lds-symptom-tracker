import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  multiSymptomExtraction,
  symptomExtraction,
} from '@/lib/ai/__fixtures__/extractions'

const mockCreate = vi.fn()

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = { create: mockCreate }
    },
  }
})

beforeEach(() => {
  vi.clearAllMocks()
  mockCreate.mockResolvedValue({
    content: [
      {
        type: 'tool_use',
        id: 'tool-1',
        name: 'extract_symptom_data',
        input: symptomExtraction,
      },
    ],
  })
})

describe('claudeProvider.extract', () => {
  it('extrahiert Daten ohne Context (abwärtskompatibel)', async () => {
    const { claudeProvider } = await import('@/lib/ai/providers/claude')
    const result = await claudeProvider.extract('Kopfschmerzen rechts')

    expect(result).toEqual(symptomExtraction)
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.not.stringContaining('Frühere Korrekturen'),
      }),
    )
  })

  it('hängt Corrections-Context an System-Prompt an', async () => {
    const correctionContext =
      'Frühere Korrekturen dieses Patienten:\n- "Rügge" wurde korrigiert zu "Rücken" (Feld: body_region, 3x)'

    const { claudeProvider } = await import('@/lib/ai/providers/claude')
    await claudeProvider.extract('Rügge tuet weh', {
      corrections: correctionContext,
    })

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining(correctionContext),
      }),
    )
  })

  it('verwendet Basis-System-Prompt ohne Corrections wenn Context leer', async () => {
    const { claudeProvider } = await import('@/lib/ai/providers/claude')
    await claudeProvider.extract('Kopfschmerzen', { corrections: '' })

    const callArgs = mockCreate.mock.calls[0][0]
    // System prompt should not end with correction block
    expect(callArgs.system).not.toContain('Frühere Korrekturen')
  })

  it('verwendet Basis-System-Prompt wenn Context undefined', async () => {
    const { claudeProvider } = await import('@/lib/ai/providers/claude')
    await claudeProvider.extract('Kopfschmerzen', {})

    const callArgs = mockCreate.mock.calls[0][0]
    expect(callArgs.system).not.toContain('Frühere Korrekturen')
  })

  it('wirft Fehler wenn Claude kein Tool-Use zurückgibt', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Something went wrong' }],
    })

    const { claudeProvider } = await import('@/lib/ai/providers/claude')

    await expect(claudeProvider.extract('Test')).rejects.toThrow(
      'Claude returned no tool use response',
    )
  })

  it('System-Prompt enthält Symptom-Taxonomie', async () => {
    const { claudeProvider } = await import('@/lib/ai/providers/claude')
    await claudeProvider.extract('Kopfschmerzen')

    const callArgs = mockCreate.mock.calls[0][0]
    // Taxonomy terms should be present in the system prompt
    expect(callArgs.system).toContain('Kopfschmerzen')
    expect(callArgs.system).toContain('Rückenschmerzen')
    expect(callArgs.system).toContain('Schwindel')
    // Body regions from taxonomy
    expect(callArgs.system).toContain('unterer Rücken')
    expect(callArgs.system).toContain('Schläfe')
    // Symptom types from taxonomy
    expect(callArgs.system).toContain('stechend')
    expect(callArgs.system).toContain('pochend')
  })

  it('System-Prompt enthält Few-Shot-Beispiele und Negationsregeln', async () => {
    const { claudeProvider } = await import('@/lib/ai/providers/claude')
    await claudeProvider.extract('Test')

    const callArgs = mockCreate.mock.calls[0][0]
    // Few-shot examples
    expect(callArgs.system).toContain('Beispiele')
    expect(callArgs.system).toContain('symptomIndex')
    // Negation rules
    expect(callArgs.system).toContain('Negationen')
    expect(callArgs.system).toContain('resolved')
    expect(callArgs.system).toContain('improving')
    expect(callArgs.system).toContain('worsening')
  })

  it('Tool-Schema enthält symptomIndex-Feld', async () => {
    const { claudeProvider } = await import('@/lib/ai/providers/claude')
    await claudeProvider.extract('Test')

    const callArgs = mockCreate.mock.calls[0][0]
    const tool = callArgs.tools[0]

    // Verify the tool schema includes symptomIndex in field items
    const fieldItemProperties =
      tool.input_schema.properties.fields.items.properties
    expect(fieldItemProperties).toHaveProperty('symptomIndex')
    expect(fieldItemProperties.symptomIndex.type).toBe('integer')
    expect(fieldItemProperties.symptomIndex.minimum).toBe(0)
    expect(fieldItemProperties.symptomIndex.default).toBe(0)

    // symptomIndex should NOT be in required (it's optional with default)
    const required = tool.input_schema.properties.fields.items.required
    expect(required).toContain('fieldName')
    expect(required).toContain('value')
    expect(required).toContain('confidence')
    expect(required).not.toContain('symptomIndex')
  })

  it('Felder ohne symptomIndex erhalten Default 0 via Zod-Transform', async () => {
    // Simulate Claude returning fields WITHOUT symptomIndex
    mockCreate.mockResolvedValue({
      content: [
        {
          type: 'tool_use',
          id: 'tool-2',
          name: 'extract_symptom_data',
          input: {
            eventType: 'symptom',
            fields: [
              {
                fieldName: 'symptom_name',
                value: 'Kopfschmerzen',
                confidence: 95,
              },
              { fieldName: 'body_region', value: 'Kopf', confidence: 90 },
            ],
          },
        },
      ],
    })

    const { claudeProvider } = await import('@/lib/ai/providers/claude')
    const result = await claudeProvider.extract('Kopfschmerzen')

    // Zod should default symptomIndex to 0
    expect(result.fields[0].symptomIndex).toBe(0)
    expect(result.fields[1].symptomIndex).toBe(0)
  })

  it('Multi-Symptom-Extraktion mit verschiedenen symptomIndex-Werten', async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: 'tool_use',
          id: 'tool-3',
          name: 'extract_symptom_data',
          input: multiSymptomExtraction,
        },
      ],
    })

    const { claudeProvider } = await import('@/lib/ai/providers/claude')
    const result = await claudeProvider.extract(
      'Kopfweh und Übelkeit nach dem Joggen',
    )

    expect(result).toEqual(multiSymptomExtraction)

    // Verify symptomIndex 0 fields (Kopfschmerzen)
    const symptom0Fields = result.fields.filter((f) => f.symptomIndex === 0)
    expect(symptom0Fields.length).toBeGreaterThan(0)
    expect(symptom0Fields.some((f) => f.fieldName === 'symptom_name')).toBe(
      true,
    )

    // Verify symptomIndex 1 fields (Übelkeit)
    const symptom1Fields = result.fields.filter((f) => f.symptomIndex === 1)
    expect(symptom1Fields.length).toBeGreaterThan(0)
    expect(
      symptom1Fields.find((f) => f.fieldName === 'symptom_name')?.value,
    ).toBe('Übelkeit')
  })

  it('Felder mit null-Werten werden herausgefiltert', async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: 'tool_use',
          id: 'tool-4',
          name: 'extract_symptom_data',
          input: {
            eventType: 'symptom',
            fields: [
              {
                fieldName: 'symptom_name',
                value: 'Kopfschmerzen',
                confidence: 95,
                symptomIndex: 0,
              },
              {
                fieldName: 'body_region',
                value: null,
                confidence: 50,
                symptomIndex: 0,
              },
              {
                fieldName: 'side',
                value: 'rechts',
                confidence: 90,
                symptomIndex: 0,
              },
            ],
          },
        },
      ],
    })

    const { claudeProvider } = await import('@/lib/ai/providers/claude')
    const result = await claudeProvider.extract('Kopfschmerzen rechts')

    // null-value field should be filtered out
    expect(result.fields).toHaveLength(2)
    expect(result.fields.map((f) => f.fieldName)).toEqual([
      'symptom_name',
      'side',
    ])
  })
})
