const DISPLAY_BINARY_OPERATORS: Record<string, string> = {
  '+': '+',
  '-': '−',
  '*': '×',
  '/': '÷',
}

/** Splits a canonical expression into number literals and single-character tokens. */
function tokenize(expression: string): string[] {
  const tokens: string[] = []
  let index = 0

  while (index < expression.length) {
    const char = expression[index]
    if (/[0-9.]/.test(char)) {
      let end = index + 1
      while (end < expression.length && /[0-9.]/.test(expression[end])) end += 1
      tokens.push(expression.slice(index, end))
      index = end
    } else {
      tokens.push(char)
      index += 1
    }
  }

  return tokens
}

/** A '-' is unary (leading, no spacing) unless it directly follows a completed value. */
function isUnaryMinus(tokens: string[], index: number): boolean {
  const previous = tokens[index - 1]
  return previous === undefined || previous === '(' || previous === '√' || previous in DISPLAY_BINARY_OPERATORS
}

/**
 * Converts a canonical parser expression ("7*8") into a human-friendly display
 * string ("7 × 8"). Only cosmetic: `√ ^ % ( )` are left as-is per the spec, and
 * `* / -` are swapped for `× ÷ −` with binary operators padded by spaces.
 */
export function prettify(expression: string): string {
  const tokens = tokenize(expression)

  return tokens
    .map((token, index) => {
      if (token === '-') {
        return isUnaryMinus(tokens, index) ? '−' : ' − '
      }
      if (token in DISPLAY_BINARY_OPERATORS) {
        return ` ${DISPLAY_BINARY_OPERATORS[token]} `
      }
      return token
    })
    .join('')
    .trim()
}

/** Formats a backend numeric result for display: trims float noise and trailing zeros. */
export function formatNumber(value: number): string {
  if (Number.isNaN(value)) return 'NaN'
  if (!Number.isFinite(value)) return value > 0 ? '∞' : '−∞'
  if (Number.isInteger(value)) return value.toString()

  // Rounding to 12 significant digits clears floating-point artifacts (e.g. 0.1 + 0.2)
  // while `.toString()` on the resulting number naturally trims trailing zeros.
  const rounded = Number(value.toPrecision(12))
  return rounded.toString()
}
