import { useCallback, useRef, useState } from 'react'
import { evaluate as evaluateExpression } from '../api/calculatorClient'
import { formatNumber } from '../lib/format'
import type { CalculatorActions, CalculatorInput, CalculatorState } from '../types'

const BINARY_OPERATORS = new Set<string>(['+', '-', '*', '/', '^'])

interface InternalState extends CalculatorState {
  /** True right after a successful `=`/error, before the next key is pressed. */
  justEvaluated: boolean
}

const initialState: InternalState = {
  expression: '',
  result: null,
  error: null,
  isEvaluating: false,
  justEvaluated: false,
}

function lastChar(expression: string): string | undefined {
  return expression.length > 0 ? expression[expression.length - 1] : undefined
}

/** The run of digits/'.' currently being typed, scanning back from the end of the expression. */
function currentNumberSegment(expression: string): string {
  let start = expression.length
  while (start > 0 && /[0-9.]/.test(expression[start - 1])) start -= 1
  return expression.slice(start)
}

function unmatchedOpenParens(expression: string): number {
  let balance = 0
  for (const char of expression) {
    if (char === '(') balance += 1
    else if (char === ')') balance -= 1
  }
  return balance
}

/**
 * Lightweight, non-authoritative guards for good UX only. The backend is the source of
 * truth for validation, so this deliberately does not re-implement the full grammar -
 * it just blocks the handful of keystrokes that can never lead to a valid expression
 * (leading binary operators, back-to-back binary operators, stray parentheses/percent).
 */
function canInsert(expression: string, key: CalculatorInput): boolean {
  const previous = lastChar(expression)

  if (key === '.') return !currentNumberSegment(expression).includes('.')

  if (key === '-') return true // always valid: either unary or binary minus

  if (key === '(' || key === '√') return true // valid anywhere; an implied '*' is added after a value

  if (key === ')') {
    if (previous === undefined || previous === '(' || previous === '√' || BINARY_OPERATORS.has(previous)) return false
    return unmatchedOpenParens(expression) > 0
  }

  if (key === '%') {
    if (previous === undefined || previous === '(' || previous === '√') return false
    return !BINARY_OPERATORS.has(previous)
  }

  if (BINARY_OPERATORS.has(key)) {
    if (previous === undefined || previous === '(' || BINARY_OPERATORS.has(previous)) return false
    return true
  }

  return true // digits
}

function appendKey(expression: string, key: CalculatorInput): string {
  const previous = lastChar(expression)
  const afterNumber = previous !== undefined && /[0-9.]/.test(previous)
  const afterClosedValue = previous === ')' || previous === '%'

  // Implicit multiplication: opening a value right after a completed one inserts '*'
  // ("5(" -> "5*(", "(2+3)5" -> "(2+3)*5"). Adjacent digits just extend one number.
  if (key === '(' || key === '√') {
    return afterNumber || afterClosedValue ? `${expression}*${key}` : expression + key
  }
  if (/[0-9]/.test(key)) {
    return afterClosedValue ? `${expression}*${key}` : expression + key
  }
  if (key === '.') {
    if (afterClosedValue) return `${expression}*0.`
    if (currentNumberSegment(expression) === '') return `${expression}0.`
    return expression + key
  }

  return expression + key
}

function toErrorMessage(caughtError: unknown): string {
  return caughtError instanceof Error ? caughtError.message : 'Something went wrong. Please try again.'
}

/**
 * Owns the calculator's canonical expression state and the "continue from result" rule:
 * after a result is shown, a digit starts a fresh expression while an operator continues
 * from the previous result. Never performs arithmetic itself - `evaluate` is the only
 * thing that produces a number, and it always comes from the backend.
 */
export function useCalculator(): CalculatorState & CalculatorActions {
  const [state, setState] = useState<InternalState>(initialState)
  const stateRef = useRef(state)
  stateRef.current = state

  const inputKey = useCallback((key: CalculatorInput) => {
    setState((previous) => {
      let expression = previous.expression

      if (previous.justEvaluated) {
        const continuesFromResult = key === '%' || BINARY_OPERATORS.has(key)
        expression = continuesFromResult && previous.result !== null ? formatNumber(previous.result) : ''
      }

      if (!canInsert(expression, key)) {
        return previous.justEvaluated
          ? { expression, result: null, error: null, isEvaluating: false, justEvaluated: false }
          : previous
      }

      return {
        expression: appendKey(expression, key),
        result: null,
        error: null,
        isEvaluating: false,
        justEvaluated: false,
      }
    })
  }, [])

  const backspace = useCallback(() => {
    setState((previous) => ({
      expression: previous.expression.slice(0, -1),
      result: null,
      error: null,
      isEvaluating: false,
      justEvaluated: false,
    }))
  }, [])

  const clear = useCallback(() => {
    setState(initialState)
  }, [])

  const evaluate = useCallback(() => {
    const { expression } = stateRef.current
    if (expression.length === 0) return

    setState((previous) => ({ ...previous, isEvaluating: true }))

    evaluateExpression(expression)
      .then((result) => {
        setState({ expression, result, error: null, isEvaluating: false, justEvaluated: true })
      })
      .catch((caughtError: unknown) => {
        setState({ expression, result: null, error: toErrorMessage(caughtError), isEvaluating: false, justEvaluated: true })
      })
  }, [])

  return {
    expression: state.expression,
    result: state.result,
    error: state.error,
    isEvaluating: state.isEvaluating,
    inputKey,
    evaluate,
    clear,
    backspace,
  }
}
