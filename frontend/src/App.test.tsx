import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import * as calculatorClient from './api/calculatorClient'

vi.mock('./api/calculatorClient', () => ({
  evaluate: vi.fn(),
}))

const evaluateMock = vi.mocked(calculatorClient.evaluate)

describe('App', () => {
  beforeEach(() => {
    evaluateMock.mockReset()
  })

  it('renders the keypad and the display', () => {
    render(<App />)
    expect(screen.getByTestId('expression-display')).toBeInTheDocument()
    expect(screen.getByTestId('result-display')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '7' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Equals' })).toBeInTheDocument()
  })

  it('shows "7 × 8" in the display after clicking 7, ×, 8', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '7' }))
    await user.click(screen.getByRole('button', { name: 'Multiply' }))
    await user.click(screen.getByRole('button', { name: '8' }))

    expect(screen.getByTestId('expression-display')).toHaveTextContent('7 × 8')
  })

  it('calls evaluate with the canonical string and renders the returned result', async () => {
    evaluateMock.mockResolvedValueOnce(56)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '7' }))
    await user.click(screen.getByRole('button', { name: 'Multiply' }))
    await user.click(screen.getByRole('button', { name: '8' }))
    await user.click(screen.getByRole('button', { name: 'Equals' }))

    expect(evaluateMock).toHaveBeenCalledWith('7*8')
    expect(await screen.findByTestId('result-display')).toHaveTextContent('56')
  })

  it('renders the backend error message verbatim when the API rejects', async () => {
    evaluateMock.mockRejectedValueOnce(new Error('division by zero'))
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '5' }))
    await user.click(screen.getByRole('button', { name: 'Divide' }))
    await user.click(screen.getByRole('button', { name: '0' }))
    await user.click(screen.getByRole('button', { name: 'Equals' }))

    const resultRegion = await screen.findByText('division by zero')
    expect(resultRegion).toBeInTheDocument()
    expect(resultRegion.className).toMatch(/red/)
  })

  it('handles a network failure gracefully, without crashing the app', async () => {
    evaluateMock.mockRejectedValueOnce(
      new Error('Could not reach the calculator service. Check your connection and try again.'),
    )
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '1' }))
    await user.click(screen.getByRole('button', { name: 'Add' }))
    await user.click(screen.getByRole('button', { name: '1' }))
    await user.click(screen.getByRole('button', { name: 'Equals' }))

    expect(await screen.findByText(/could not reach/i)).toBeInTheDocument()

    // the app must still be fully interactive after a failure - no crash, no stuck state
    await user.click(screen.getByRole('button', { name: 'All clear' }))
    expect(screen.getByTestId('expression-display').textContent).toBe('\u00A0')
    expect(screen.getByTestId('result-display')).toHaveTextContent('0')
  })

  it('AC clears the expression; backspace deletes only the last character', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '1' }))
    await user.click(screen.getByRole('button', { name: '2' }))
    expect(screen.getByTestId('expression-display')).toHaveTextContent('12')

    await user.click(screen.getByRole('button', { name: 'Backspace' }))
    expect(screen.getByTestId('expression-display')).toHaveTextContent('1')

    await user.click(screen.getByRole('button', { name: 'All clear' }))
    expect(screen.getByTestId('expression-display').textContent).toBe('\u00A0')
  })

  it('supports keyboard input: digits/operators build the expression, Enter evaluates', async () => {
    evaluateMock.mockResolvedValueOnce(5)
    const user = userEvent.setup()
    render(<App />)

    await user.keyboard('2+3')
    expect(screen.getByTestId('expression-display')).toHaveTextContent('2 + 3')

    await user.keyboard('{Enter}')
    expect(evaluateMock).toHaveBeenCalledWith('2+3')
    expect(await screen.findByTestId('result-display')).toHaveTextContent('5')
  })

  it('supports Escape to clear and Backspace to delete via the keyboard', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.keyboard('99')
    expect(screen.getByTestId('expression-display')).toHaveTextContent('99')

    await user.keyboard('{Escape}')
    expect(screen.getByTestId('expression-display').textContent).toBe('\u00A0')

    await user.keyboard('42')
    expect(screen.getByTestId('expression-display')).toHaveTextContent('42')

    await user.keyboard('{Backspace}')
    expect(screen.getByTestId('expression-display')).toHaveTextContent('4')
  })

  it('ignores keys with no calculator meaning, without crashing', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.keyboard('4')
    await user.keyboard('{Tab}')
    expect(screen.getByTestId('expression-display')).toHaveTextContent('4')
  })

  it('maps ÷ to the canonical "/" (not "÷") when evaluating', async () => {
    evaluateMock.mockResolvedValueOnce(4)
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '8' }))
    await user.click(screen.getByRole('button', { name: 'Divide' }))
    await user.click(screen.getByRole('button', { name: '2' }))
    await user.click(screen.getByRole('button', { name: 'Equals' }))

    expect(evaluateMock).toHaveBeenCalledWith('8/2')
    expect(evaluateMock).not.toHaveBeenCalledWith('8÷2')
  })
})
