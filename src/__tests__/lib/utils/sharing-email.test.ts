import { describe, expect, it } from 'vitest'

import { buildMailtoLink } from '@/lib/utils/sharing-email'

describe('buildMailtoLink', () => {
  const baseParams = {
    sharingUrl: 'https://app.example.com/share/abc123',
    dateFrom: '2025-12-15',
    dateTo: '2026-03-15',
    accessDuration: '48h',
  }

  it('erstellt mailto:-Link mit Empfänger', () => {
    const result = buildMailtoLink({
      ...baseParams,
      recipientEmail: 'dr.mueller@spital.ch',
    })

    expect(result).toMatch(/^mailto:dr\.mueller@spital\.ch\?/)
  })

  it('erstellt mailto:-Link ohne Empfänger (leerer String)', () => {
    const result = buildMailtoLink({
      ...baseParams,
      recipientEmail: '',
    })

    expect(result).toMatch(/^mailto:\?/)
  })

  it('erstellt mailto:-Link ohne Empfänger (undefined)', () => {
    const result = buildMailtoLink(baseParams)

    expect(result).toMatch(/^mailto:\?/)
  })

  it('enthält korrekten Subject-Header', () => {
    const result = buildMailtoLink(baseParams)

    expect(result).toContain('subject=')
    expect(result).toContain(encodeURIComponent('Symptom-Daten — Sharing-Link'))
  })

  it('enthält den Sharing-URL im Body', () => {
    const result = buildMailtoLink(baseParams)

    expect(result).toContain(
      encodeURIComponent('https://app.example.com/share/abc123'),
    )
  })

  it('enthält Zeitraum im Body (DD.MM.YYYY formatiert)', () => {
    const result = buildMailtoLink(baseParams)

    // Eingabe ist YYYY-MM-DD, Ausgabe muss DD.MM.YYYY sein
    expect(result).toContain(encodeURIComponent('15.12.2025'))
    expect(result).toContain(encodeURIComponent('15.03.2026'))
    // Sicherstellen dass ISO-Format NICHT im Body steht
    expect(result).not.toContain(encodeURIComponent('2025-12-15'))
    expect(result).not.toContain(encodeURIComponent('2026-03-15'))
  })

  it('enthält Zugriffsdauer-Label im Body', () => {
    const result = buildMailtoLink({ ...baseParams, accessDuration: '24h' })
    expect(result).toContain(encodeURIComponent('24 Stunden'))

    const result7d = buildMailtoLink({ ...baseParams, accessDuration: '7d' })
    expect(result7d).toContain(encodeURIComponent('7 Tage'))
  })

  it('encodiert Sonderzeichen und Umlaute korrekt', () => {
    const result = buildMailtoLink({
      ...baseParams,
      recipientEmail: 'dr.müller@spital.ch',
    })

    // E-Mail selbst ist direkt im Empfängerfeld, nicht encoded
    expect(result).toMatch(/^mailto:dr\.müller@spital\.ch\?/)
    // Body enthält encoded Umlaute
    expect(result).toContain(encodeURIComponent('Guten Tag'))
  })

  it('enthält den Sicherheitshinweis im Body', () => {
    const result = buildMailtoLink(baseParams)

    expect(result).toContain(encodeURIComponent('nur zur Ansicht verfügbar'))
  })

  it('enthält Zeilenumbrüche korrekt encoded', () => {
    const result = buildMailtoLink(baseParams)

    // Zeilenumbrüche müssen als %0A encoded sein
    expect(result).toContain('%0A')
  })
})
