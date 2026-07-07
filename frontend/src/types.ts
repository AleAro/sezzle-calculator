export type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'

export type BinaryOperatorKey = '+' | '-' | '*' | '/' | '^'

/** Every character the keypad or keyboard can insert into the canonical expression. */
export type CalculatorInput = Digit | '.' | BinaryOperatorKey | '%' | '(' | ')' | '√'

export interface EvaluateSuccessResponse {
  result: number
}

export interface EvaluateErrorResponse {
  error: string
}

export interface CalculatorState {
  /** The expression in parser-canonical form, e.g. "7*8" or "-3^2". */
  expression: string
  result: number | null
  error: string | null
  isEvaluating: boolean
}

export interface CalculatorActions {
  inputKey: (key: CalculatorInput) => void
  evaluate: () => void
  clear: () => void
  backspace: () => void
}
