import type { Correction } from '@/types/ai'

interface CorrectionGroup {
  fieldName: string
  originalValue: string
  correctedValue: string
  count: number
}

export function buildCorrectionContext(corrections: Correction[]): string {
  if (corrections.length === 0) {
    return ''
  }

  // Duplikate zusammenfassen
  const grouped = new Map<string, CorrectionGroup>()

  for (const c of corrections) {
    const key = `${c.fieldName}|${c.originalValue}|${c.correctedValue}`
    const existing = grouped.get(key)
    if (existing) {
      existing.count++
    } else {
      grouped.set(key, {
        fieldName: c.fieldName,
        originalValue: c.originalValue,
        correctedValue: c.correctedValue,
        count: 1,
      })
    }
  }

  // Sortierung: Häufigste zuerst
  const sorted = [...grouped.values()].sort((a, b) => b.count - a.count)

  const lines = sorted.map(
    (g) =>
      `- "${g.originalValue}" wurde korrigiert zu "${g.correctedValue}" (Feld: ${g.fieldName}, ${g.count}x)`,
  )

  return `Frühere Korrekturen dieses Patienten:\n${lines.join('\n')}\n\nWenn der Patient ähnliche Begriffe verwendet, setze Konfidenz höher (85+) und verwende den korrigierten Wert.`
}
