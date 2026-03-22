import { describe, expect, it } from 'vitest'

import sitemap from '@/app/sitemap'

describe('Sitemap', () => {
  const entries = sitemap()

  it('enthält alle öffentlichen Routen', () => {
    const urls = entries.map((e) => e.url)
    expect(urls).toContain('https://symptomchat.ch')
    expect(urls).toContain('https://symptomchat.ch/marketing')
    expect(urls).toContain('https://symptomchat.ch/auth/login')
    expect(urls).toContain('https://symptomchat.ch/disclaimer')
  })

  it('hat korrekte Prioritäten', () => {
    const byUrl = Object.fromEntries(entries.map((e) => [e.url, e]))
    expect(byUrl['https://symptomchat.ch'].priority).toBe(1)
    expect(byUrl['https://symptomchat.ch/marketing'].priority).toBe(0.9)
    expect(byUrl['https://symptomchat.ch/auth/login'].priority).toBe(0.5)
    expect(byUrl['https://symptomchat.ch/disclaimer'].priority).toBe(0.3)
  })

  it('hat lastModified als Date-Objekt', () => {
    for (const entry of entries) {
      expect(entry.lastModified).toBeInstanceOf(Date)
    }
  })
})
