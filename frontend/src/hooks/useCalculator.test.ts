import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as calculatorClient from '../api/calculatorClient'
import { useCalculator } from './useCalculator'

vi.mock('../api/calculatorClient', () => ({
  evaluate: vi.fn(),
}))

const evaluateMock = vi.mocked(calculatorClient.evaluate)

describe('useCalculator', () => {
  beforeEach(() => {
    evaluateMock.mockReset()
  })

  it('starts with an empty expression and no result or error', () => {
    const { result } = renderHook(() => useCalculator())
    expect(result.current.expression).toBe('')
    expect(result.current.result).toBeNull()
    expect(result.current.error).toBeNull()
    expect(result.current.isEvaluating).toBe(false)
  })

  it('builds the canonical expression key by key', () => {
    const { result } = renderHook(() => useCalculator())
    act(() => {
      result.current.inputKey('7')
      result.current.inputKey('*')
      result.current.inputKey('8')
    })
    expect(result.current.expression).toBe('7*8')
  })

  it('never inserts the display symbols - only canonical characters', () => {
    const { result } = renderHook(() => useCalculator())
    act(() => {
      result.current.inputKey('8')
      result.current.inputKey('/')
      result.current.inputKey('2')
    })
    expect(result.current.expression).toBe('8/2')
    expect(result.current.expression).not.toContain('÷')
  })

  it('blocks a leading binary operator but allows a leading minus, sqrt, or paren', () => {
    const { result } = renderHook(() => useCalculator())
    act(() => result.current.inputKey('*'))
    expect(result.current.expression).toBe('')

    act(() => result.current.inputKey('-'))
    expect(result.current.expression).toBe('-')

    act(() => result.current.clear())
    act(() => result.current.inputKey('√'))
    expect(result.current.expression).toBe('√')

    act(() => result.current.clear())
    act(() => result.current.inputKey('('))
    expect(result.current.expression).toBe('(')
  })

  it('inserts an implied "*" when "(" or "√" opens a value right after a completed one', () => {
    const { result } = renderHook(() => useCalculator())
    act(() => {
      result.current.inputKey('5')
      result.current.inputKey('(')
    })
    expect(result.current.expression).toBe('5*(') // implicit multiplication, Google-style

    act(() => {
      result.current.clear()
      result.current.inputKey('(')
      result.current.inputKey('(')
    })
    expect(result.current.expression).toBe('((') // nested parens: no implied '*'

    act(() => {
      result.current.clear()
      result.current.inputKey('5')
      result.current.inputKey('+')
      result.current.inputKey('(')
    })
    expect(result.current.expression).toBe('5+(') // after an operator: no implied '*'

    act(() => {
      result.current.clear()
      result.current.inputKey('2')
      result.current.inputKey('√')
    })
    expect(result.current.expression).toBe('2*√') // '√' after a number also implies '*'
  })

  it('inserts an implied "*" for a value that follows a closed group or percent', () => {
    const { result } = renderHook(() => useCalculator())
    act(() => {
      result.current.inputKey('(')
      result.current.inputKey('2')
      result.current.inputKey(')')
      result.current.inputKey('5')
    })
    expect(result.current.expression).toBe('(2)*5') // digit after ')' implies '*'

    act(() => {
      result.current.clear()
      result.current.inputKey('(')
      result.current.inputKey('2')
      result.current.inputKey(')')
      result.current.inputKey('(')
    })
    expect(result.current.expression).toBe('(2)*(') // ')(' implies '*'

    act(() => {
      result.current.clear()
      result.current.inputKey('(')
      result.current.inputKey('2')
      result.current.inputKey(')')
      result.current.inputKey('.')
    })
    expect(result.current.expression).toBe('(2)*0.') // '.' after ')' implies '*' and a leading 0
  })

  it('blocks ")" right after "√" or a binary operator', () => {
    const { result } = renderHook(() => useCalculator())
    act(() => {
      result.current.inputKey('(')
      result.current.inputKey('√')
      result.current.inputKey(')')
    })
    expect(result.current.expression).toBe('(√') // no operand for √ yet

    act(() => {
      result.current.clear()
      result.current.inputKey('(')
      result.current.inputKey('5')
      result.current.inputKey('+')
      result.current.inputKey(')')
    })
    expect(result.current.expression).toBe('(5+') // no right-hand operand for +
  })

  it('recognizes an already-closed group when checking a later closing paren', () => {
    const { result } = renderHook(() => useCalculator())
    act(() => {
      result.current.inputKey('(')
      result.current.inputKey('2')
      result.current.inputKey('+')
      result.current.inputKey('3')
      result.current.inputKey(')')
      result.current.inputKey('*')
      result.current.inputKey('(')
      result.current.inputKey('4')
      result.current.inputKey(')')
    })
    expect(result.current.expression).toBe('(2+3)*(4)')
  })

  it('ignores a second binary operator pressed right after another one', () => {
    const { result } = renderHook(() => useCalculator())
    act(() => {
      result.current.inputKey('5')
      result.current.inputKey('+')
      result.current.inputKey('*')
    })
    expect(result.current.expression).toBe('5+')
  })

  it('still allows a unary minus directly after another operator', () => {
    const { result } = renderHook(() => useCalculator())
    act(() => {
      result.current.inputKey('2')
      result.current.inputKey('*')
      result.current.inputKey('-')
      result.current.inputKey('3')
    })
    expect(result.current.expression).toBe('2*-3')
  })

  it('blocks a closing paren with no matching open paren, but allows one once balanced', () => {
    const { result } = renderHook(() => useCalculator())
    act(() => {
      result.current.inputKey('5')
      result.current.inputKey(')')
    })
    expect(result.current.expression).toBe('5')

    act(() => {
      result.current.clear()
      result.current.inputKey('(')
      result.current.inputKey('5')
      result.current.inputKey(')')
    })
    expect(result.current.expression).toBe('(5)')
  })

  it('auto-prefixes a leading decimal point with a 0, and blocks a second dot in the same number', () => {
    const { result } = renderHook(() => useCalculator())
    act(() => result.current.inputKey('.'))
    expect(result.current.expression).toBe('0.')

    act(() => {
      result.current.inputKey('1')
      result.current.inputKey('.')
    })
    expect(result.current.expression).toBe('0.1')

    act(() => {
      result.current.clear()
      result.current.inputKey('3')
      result.current.inputKey('.')
      result.current.inputKey('1')
    })
    expect(result.current.expression).toBe('3.1') // decimal point within a number
  })

  it('also auto-prefixes a decimal point that starts a new segment after an operator', () => {
    const { result } = renderHook(() => useCalculator())
    act(() => {
      result.current.inputKey('5')
      result.current.inputKey('+')
      result.current.inputKey('.')
    })
    expect(result.current.expression).toBe('5+0.')
  })

  it('guards postfix % so it only ever follows a completed value', () => {
    const { result } = renderHook(() => useCalculator())
    act(() => result.current.inputKey('%'))
    expect(result.current.expression).toBe('')

    act(() => {
      result.current.inputKey('5')
      result.current.inputKey('0')
      result.current.inputKey('%')
    })
    expect(result.current.expression).toBe('50%')

    act(() => result.current.inputKey('+'))
    act(() => result.current.inputKey('%'))
    expect(result.current.expression).toBe('50%+')
  })

  it('calls evaluate with the canonical expression and stores the numeric result', async () => {
    evaluateMock.mockResolvedValueOnce(14)
    const { result } = renderHook(() => useCalculator())
    act(() => {
      result.current.inputKey('2')
      result.current.inputKey('+')
      result.current.inputKey('3')
      result.current.inputKey('*')
      result.current.inputKey('4')
    })

    act(() => result.current.evaluate())

    await waitFor(() => expect(result.current.result).toBe(14))
    expect(evaluateMock).toHaveBeenCalledWith('2+3*4')
    expect(result.current.error).toBeNull()
  })

  it('does not call evaluate when the expression is empty', () => {
    const { result } = renderHook(() => useCalculator())
    act(() => result.current.evaluate())
    expect(evaluateMock).not.toHaveBeenCalled()
  })

  it('stores a rejected evaluate call as the error state, leaving result null', async () => {
    evaluateMock.mockRejectedValueOnce(new Error('division by zero'))
    const { result } = renderHook(() => useCalculator())
    act(() => {
      result.current.inputKey('5')
      result.current.inputKey('/')
      result.current.inputKey('0')
    })

    act(() => result.current.evaluate())

    await waitFor(() => expect(result.current.error).toBe('division by zero'))
    expect(result.current.result).toBeNull()
  })

  it('falls back to a generic message when the rejection is not an Error instance', async () => {
    evaluateMock.mockRejectedValueOnce('boom')
    const { result } = renderHook(() => useCalculator())
    act(() => {
      result.current.inputKey('1')
      result.current.inputKey('+')
      result.current.inputKey('1')
    })

    act(() => result.current.evaluate())

    await waitFor(() => expect(result.current.error).toBe('Something went wrong. Please try again.'))
  })

  it('continues from the result when an operator is pressed after evaluating', async () => {
    evaluateMock.mockResolvedValueOnce(56)
    const { result } = renderHook(() => useCalculator())
    act(() => {
      result.current.inputKey('7')
      result.current.inputKey('*')
      result.current.inputKey('8')
    })
    act(() => result.current.evaluate())
    await waitFor(() => expect(result.current.result).toBe(56))

    act(() => result.current.inputKey('+'))
    expect(result.current.expression).toBe('56+')
  })

  it('clears a stale result even when the very next key is itself rejected by the guard', async () => {
    evaluateMock.mockResolvedValueOnce(56)
    const { result } = renderHook(() => useCalculator())
    act(() => {
      result.current.inputKey('7')
      result.current.inputKey('*')
      result.current.inputKey('8')
    })
    act(() => result.current.evaluate())
    await waitFor(() => expect(result.current.result).toBe(56))

    // ')' starts fresh (it isn't in the continue-from-result set) and is then
    // rejected by the guard on an empty expression - the stale result must still clear.
    act(() => result.current.inputKey(')'))
    expect(result.current.expression).toBe('')
    expect(result.current.result).toBeNull()
  })

  it('starts a fresh expression when a digit is pressed after evaluating', async () => {
    evaluateMock.mockResolvedValueOnce(56)
    const { result } = renderHook(() => useCalculator())
    act(() => {
      result.current.inputKey('7')
      result.current.inputKey('*')
      result.current.inputKey('8')
    })
    act(() => result.current.evaluate())
    await waitFor(() => expect(result.current.result).toBe(56))

    act(() => result.current.inputKey('9'))
    expect(result.current.expression).toBe('9')
    expect(result.current.result).toBeNull()
  })

  it('deletes only the last character with backspace', () => {
    const { result } = renderHook(() => useCalculator())
    act(() => {
      result.current.inputKey('1')
      result.current.inputKey('2')
    })
    act(() => result.current.backspace())
    expect(result.current.expression).toBe('1')
  })

  it('clears a stale error when backspace is pressed, letting the user fix the input', async () => {
    evaluateMock.mockRejectedValueOnce(new Error('division by zero'))
    const { result } = renderHook(() => useCalculator())
    act(() => {
      result.current.inputKey('5')
      result.current.inputKey('/')
      result.current.inputKey('0')
    })
    act(() => result.current.evaluate())
    await waitFor(() => expect(result.current.error).toBe('division by zero'))

    act(() => result.current.backspace())
    expect(result.current.error).toBeNull()
    expect(result.current.expression).toBe('5/')
  })

  it('resets expression, result, and error with clear', async () => {
    evaluateMock.mockResolvedValueOnce(3)
    const { result } = renderHook(() => useCalculator())
    act(() => {
      result.current.inputKey('1')
      result.current.inputKey('+')
      result.current.inputKey('2')
    })
    act(() => result.current.evaluate())
    await waitFor(() => expect(result.current.result).toBe(3))

    act(() => result.current.clear())
    expect(result.current.expression).toBe('')
    expect(result.current.result).toBeNull()
    expect(result.current.error).toBeNull()
  })
})
