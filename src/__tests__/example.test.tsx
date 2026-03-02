import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import Home from '@/app/page'

describe('Home Page', () => {
  it('renders the app title', () => {
    render(<Home />)
    expect(
      screen.getByRole('heading', { name: /LDS Symptom Tracker/i }),
    ).toBeInTheDocument()
  })
})
