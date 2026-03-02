import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import CapturePage from '@/app/(app)/page'

describe('Capture Page', () => {
  it('renders the app title', () => {
    render(<CapturePage />)
    expect(
      screen.getByRole('heading', { name: /LDS Symptom Tracker/i }),
    ).toBeInTheDocument()
  })
})
