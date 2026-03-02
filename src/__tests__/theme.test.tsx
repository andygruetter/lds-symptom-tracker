
import { readFileSync } from 'fs'
import { resolve } from 'path'

import { describe, expect, it } from 'vitest'

describe('Theme CSS Custom Properties', () => {
  const cssContent = readFileSync(
    resolve(__dirname, '../app/globals.css'),
    'utf-8',
  )

  it('defines patient theme as default in :root', () => {
    expect(cssContent).toContain(':root,')
    expect(cssContent).toContain("[data-theme='patient']")
  })

  it('defines doctor theme with data-theme selector', () => {
    expect(cssContent).toContain("[data-theme='doctor']")
  })

  it('patient theme uses terracotta primary color', () => {
    // #C06A3C → oklch(0.614 0.125 47.283)
    const patientBlock = cssContent.split("[data-theme='doctor']")[0]
    expect(patientBlock).toContain('--primary: oklch(0.614 0.125 47.283)')
  })

  it('doctor theme uses slate primary color', () => {
    // #374955 → oklch(0.395 0.031 237.738)
    const doctorBlock = cssContent.split("[data-theme='doctor']")[1]
    expect(doctorBlock).toContain('--primary: oklch(0.395 0.031 237.738)')
  })

  it('defines custom success and warning tokens', () => {
    expect(cssContent).toContain('--success:')
    expect(cssContent).toContain('--warning:')
    expect(cssContent).toContain('--color-success: var(--success)')
    expect(cssContent).toContain('--color-warning: var(--warning)')
  })

  it('uses Inter font variable', () => {
    expect(cssContent).toContain('var(--font-inter)')
  })

  it('does not contain .dark block', () => {
    expect(cssContent).not.toMatch(/^\.dark\s*\{/m)
  })
})
