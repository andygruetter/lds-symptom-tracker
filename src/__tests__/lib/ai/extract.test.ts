import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  singleMedicationMultiResult,
  singleSymptomMultiResult,
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
    mockExtract.mockResolvedValue(singleSymptomMultiResult)

    const { extractSymptomData } = await import('@/lib/ai/extract')
    const result = await extractSymptomData('Kopfschmerzen rechts stechend')

    expect(result).toHaveLength(1)
    expect(result[0].eventType).toBe('symptom')
    expect(result[0].fields).toHaveLength(4)
    expect(result[0].fields[0].fieldName).toBe('symptom_name')
    expect(result[0].fields[0].value).toBe('Kopfschmerzen')
    expect(mockExtract).toHaveBeenCalledWith(
      'Kopfschmerzen rechts stechend',
      undefined,
    )
  })

  it('leitet ExtractionContext an Provider weiter', async () => {
    mockExtract.mockResolvedValue(singleSymptomMultiResult)

    const { extractSymptomData } = await import('@/lib/ai/extract')
    const context = { corrections: 'Korrekturen...' }
    await extractSymptomData('Rügge tuet weh', context)

    expect(mockExtract).toHaveBeenCalledWith('Rügge tuet weh', context)
  })

  it('extrahiert Medikamenten-Daten via Provider', async () => {
    mockExtract.mockResolvedValue(singleMedicationMultiResult)

    const { extractSymptomData } = await import('@/lib/ai/extract')
    const result = await extractSymptomData('Habe Ibuprofen 400mg genommen')

    expect(result).toHaveLength(1)
    expect(result[0].eventType).toBe('medication')
    expect(result[0].fields).toHaveLength(3)
    expect(result[0].fields[0].fieldName).toBe('medication_name')
  })

  it('gibt mehrere Ergebnisse bei Multi-Symptom zurück', async () => {
    const { multiSymptomExtraction } = await import(
      '@/lib/ai/__fixtures__/extractions'
    )
    mockExtract.mockResolvedValue(multiSymptomExtraction)

    const { extractSymptomData } = await import('@/lib/ai/extract')
    const result = await extractSymptomData(
      'Kopfschmerzen und Nackenschmerzen',
    )

    expect(result).toHaveLength(2)
    expect(result[0].fields[0].value).toBe('Kopfschmerzen')
    expect(result[1].fields[0].value).toBe('Nackenschmerzen')
  })

  it('propagiert Provider-Fehler', async () => {
    mockExtract.mockRejectedValue(new Error('API unavailable'))

    const { extractSymptomData } = await import('@/lib/ai/extract')

    await expect(extractSymptomData('Test')).rejects.toThrow('API unavailable')
  })
})
