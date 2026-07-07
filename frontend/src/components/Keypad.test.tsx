import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Keypad from './Keypad'

function renderKeypad(overrides: Partial<Parameters<typeof Keypad>[0]> = {}) {
  const props = {
    canEvaluate: true,
    isEvaluating: false,
    onInputKey: vi.fn(),
    onEvaluate: vi.fn(),
    onClear: vi.fn(),
    onBackspace: vi.fn(),
    ...overrides,
  }
  render(<Keypad {...props} />)
  return props
}

const EXPECTED_LABELS = [
  '0',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  'Decimal point',
  'Add',
  'Subtract',
  'Multiply',
  'Divide',
  'Power',
  'Square root',
  'Percent',
  'Open parenthesis',
  'Close parenthesis',
  'All clear',
  'Backspace',
  'Equals',
]

describe('Keypad', () => {
  it('renders every key as a real, accessible button', () => {
    renderKeypad()
    for (const label of EXPECTED_LABELS) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
  })

  it('sends the canonical character for operators, never the display glyph', async () => {
    const user = userEvent.setup()
    const props = renderKeypad()

    await user.click(screen.getByRole('button', { name: 'Divide' }))
    expect(props.onInputKey).toHaveBeenLastCalledWith('/')

    await user.click(screen.getByRole('button', { name: 'Multiply' }))
    expect(props.onInputKey).toHaveBeenLastCalledWith('*')

    await user.click(screen.getByRole('button', { name: 'Subtract' }))
    expect(props.onInputKey).toHaveBeenLastCalledWith('-')

    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(props.onInputKey).toHaveBeenLastCalledWith('+')
  })

  it('sends the digit pressed', async () => {
    const user = userEvent.setup()
    const props = renderKeypad()
    await user.click(screen.getByRole('button', { name: '7' }))
    expect(props.onInputKey).toHaveBeenCalledWith('7')
  })

  it('calls onEvaluate when = is pressed', async () => {
    const user = userEvent.setup()
    const props = renderKeypad()
    await user.click(screen.getByRole('button', { name: 'Equals' }))
    expect(props.onEvaluate).toHaveBeenCalledTimes(1)
  })

  it('disables = when the expression is empty or a request is in flight', () => {
    const { rerender } = render(<Keypad canEvaluate={false} isEvaluating={false} onInputKey={vi.fn()} onEvaluate={vi.fn()} onClear={vi.fn()} onBackspace={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Equals' })).toBeDisabled()

    rerender(<Keypad canEvaluate={true} isEvaluating={true} onInputKey={vi.fn()} onEvaluate={vi.fn()} onClear={vi.fn()} onBackspace={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Equals' })).toBeDisabled()

    rerender(<Keypad canEvaluate={true} isEvaluating={false} onInputKey={vi.fn()} onEvaluate={vi.fn()} onClear={vi.fn()} onBackspace={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Equals' })).toBeEnabled()
  })

  it('calls onClear and onBackspace', async () => {
    const user = userEvent.setup()
    const props = renderKeypad()

    await user.click(screen.getByRole('button', { name: 'All clear' }))
    expect(props.onClear).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'Backspace' }))
    expect(props.onBackspace).toHaveBeenCalledTimes(1)
  })

  it('sends the canonical character for parentheses, percent, and the decimal point', async () => {
    const user = userEvent.setup()
    const props = renderKeypad()

    await user.click(screen.getByRole('button', { name: 'Open parenthesis' }))
    expect(props.onInputKey).toHaveBeenLastCalledWith('(')

    await user.click(screen.getByRole('button', { name: 'Close parenthesis' }))
    expect(props.onInputKey).toHaveBeenLastCalledWith(')')

    await user.click(screen.getByRole('button', { name: 'Percent' }))
    expect(props.onInputKey).toHaveBeenLastCalledWith('%')

    await user.click(screen.getByRole('button', { name: 'Decimal point' }))
    expect(props.onInputKey).toHaveBeenLastCalledWith('.')

    await user.click(screen.getByRole('button', { name: '0' }))
    expect(props.onInputKey).toHaveBeenLastCalledWith('0')
  })

  it('sends √ and ^ as their own keys', async () => {
    const user = userEvent.setup()
    const props = renderKeypad()

    await user.click(screen.getByRole('button', { name: 'Square root' }))
    expect(props.onInputKey).toHaveBeenLastCalledWith('√')

    await user.click(screen.getByRole('button', { name: 'Power' }))
    expect(props.onInputKey).toHaveBeenLastCalledWith('^')
  })
})
