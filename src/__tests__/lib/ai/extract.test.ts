import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  symptomExtraction,
  symptomWithMedicationExtraction,
} from '@/lib/ai/__fixtures__/extractions'

// Mock the Claude provider
const mockExtract = vi.fn()
vi.mock('@/lib/ai/providers/claude', () => ({
  claudeProvider: {
    extract: (...args: unknown[]) => mockExtract(...args),
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('extractSymptomData', () => {
  it('extrahiert Symptom-Daten via Provider', async () => {
    mockExtract.mockResolvedValue(symptomExtraction)

    const { extractSymptomData } = await import('@/lib/ai/extract')
    const result = await extractSymptomData('Kopfschmerzen rechts stechend')

    expect(result.fields).toHaveLength(5)
    expect(result.fields[0].fieldName).toBe('symptom_name')
    expect(result.fields[0].value).toBe('Kopfschmerzen')
    expect(result.fields[0].symptomIndex).toBe(0)
    expect(mockExtract).toHaveBeenCalledWith(
      'Kopfschmerzen rechts stechend',
      undefined,
    )
  })

  it('leitet ExtractionContext an Provider weiter', async () => {
    mockExtract.mockResolvedValue(symptomExtraction)

    const { extractSymptomData } = await import('@/lib/ai/extract')
    const context = { corrections: 'Korrekturen...' }
    await extractSymptomData('Rügge tuet weh', context)

    expect(mockExtract).toHaveBeenCalledWith('Rügge tuet weh', context)
  })

  it('extrahiert Symptom-mit-Medikament-Daten via Provider', async () => {
    mockExtract.mockResolvedValue(symptomWithMedicationExtraction)

    const { extractSymptomData } = await import('@/lib/ai/extract')
    const result = await extractSymptomData('Habe Ibuprofen 400mg genommen')

    expect(result.fields).toHaveLength(4)
    expect(result.fields[0].fieldName).toBe('symptom_name')
  })

  it('propagiert Provider-Fehler', async () => {
    mockExtract.mockRejectedValue(new Error('API unavailable'))

    const { extractSymptomData } = await import('@/lib/ai/extract')

    await expect(extractSymptomData('Test')).rejects.toThrow('API unavailable')
  })
})
