import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Display from './Display'

describe('Display', () => {
  it('renders the prettified expression and an idle result of 0', () => {
    render(<Display expression="7*8" result={null} error={null} />)
    expect(screen.getByTestId('expression-display')).toHaveTextContent('7 × 8')
    expect(screen.getByTestId('result-display')).toHaveTextContent('0')
  })

  it('shows a non-breaking placeholder (not the digit 0) while the expression is empty', () => {
    render(<Display expression="" result={null} error={null} />)
    expect(screen.getByTestId('expression-display').textContent).toBe('\u00A0')
  })

  it('renders a successful numeric result', () => {
    render(<Display expression="7*8" result={56} error={null} />)
    expect(screen.getByTestId('result-display')).toHaveTextContent('56')
  })

  it('renders the error message verbatim, styled distinctly from a normal result', () => {
    render(<Display expression="5/0" result={null} error="division by zero" />)
    const resultRegion = screen.getByTestId('result-display')
    expect(resultRegion).toHaveTextContent('division by zero')
    expect(resultRegion.className).toMatch(/red/)
  })

  it('marks the result region as a polite live region', () => {
    render(<Display expression="" result={null} error={null} />)
    expect(screen.getByTestId('result-display')).toHaveAttribute('aria-live', 'polite')
  })
})
