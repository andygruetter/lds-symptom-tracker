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
        input: { items: [symptomExtraction] },
      },
    ],
  })
})

describe('claudeProvider.extract', () => {
  it('extrahiert Daten und gibt Array zurück', async () => {
    const { claudeProvider } = await import('@/lib/ai/providers/claude')
    const result = await claudeProvider.extract('Kopfschmerzen rechts')

    expect(result).toEqual([symptomExtraction])
  })

  it('extrahiert mehrere Symptome aus einer Eingabe', async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: 'tool_use',
          id: 'tool-1',
          name: 'extract_symptom_data',
          input: { items: multiSymptomExtraction },
        },
      ],
    })

    const { claudeProvider } = await import('@/lib/ai/providers/claude')
    const result = await claudeProvider.extract(
      'Kopfschmerzen und Nackenschmerzen',
    )

    expect(result).toHaveLength(2)
    expect(result[0].fields[0].value).toBe('Kopfschmerzen')
    expect(result[1].fields[0].value).toBe('Nackenschmerzen')
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
})
