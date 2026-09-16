import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import StatusBadge from '../components/StatusBadge'

describe('StatusBadge', () => {
  it('renders the status text with underscores replaced by spaces', () => {
    render(<StatusBadge status="auto_submitted" />)
    expect(screen.getByText('auto submitted')).toBeInTheDocument()
  })

  it('falls back gracefully for an unrecognized status', () => {
    render(<StatusBadge status="mystery_state" />)
    expect(screen.getByText('mystery state')).toBeInTheDocument()
  })
})
