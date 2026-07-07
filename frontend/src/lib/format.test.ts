import { describe, expect, it } from 'vitest'
import { formatNumber, prettify } from './format'

describe('prettify', () => {
  it('renders an empty expression as an empty string', () => {
    expect(prettify('')).toBe('')
  })

  it('maps * to × with surrounding spaces', () => {
    expect(prettify('7*8')).toBe('7 × 8')
  })

  it('maps / to ÷ and + is padded with spaces', () => {
    expect(prettify('8/2')).toBe('8 ÷ 2')
    expect(prettify('2+3')).toBe('2 + 3')
  })

  it('keeps a leading unary minus tight against its operand', () => {
    expect(prettify('-3^2')).toBe('−3^2')
  })

  it('pads a binary minus but not a unary minus following an operator', () => {
    expect(prettify('2*-3')).toBe('2 × −3')
    expect(prettify('5-2')).toBe('5 − 2')
  })

  it('leaves parentheses, ^, %, and √ as-is (no substitution, no padding)', () => {
    expect(prettify('(2+3)*4^2')).toBe('(2 + 3) × 4^2')
    expect(prettify('200*10%')).toBe('200 × 10%')
    expect(prettify('√9')).toBe('√9')
    expect(prettify('√(4+5)')).toBe('√(4 + 5)')
  })

  it('handles a trailing operator while an expression is still being typed', () => {
    expect(prettify('2+')).toBe('2 +')
  })
})

describe('formatNumber', () => {
  it('renders integers without a trailing decimal', () => {
    expect(formatNumber(5)).toBe('5')
    expect(formatNumber(20)).toBe('20')
    expect(formatNumber(-9)).toBe('-9')
    expect(formatNumber(0)).toBe('0')
  })

  it('trims ordinary decimals without adding noise', () => {
    expect(formatNumber(0.5)).toBe('0.5')
    expect(formatNumber(3.14)).toBe('3.14')
  })

  it('clears floating-point artifacts', () => {
    expect(formatNumber(0.1 + 0.2)).toBe('0.3')
    expect(formatNumber(0.30000000000000004)).toBe('0.3')
  })

  it('rounds long repeating decimals to a tidy precision', () => {
    expect(formatNumber(1 / 3)).toBe('0.333333333333')
  })

  it('handles non-finite values defensively', () => {
    expect(formatNumber(Number.NaN)).toBe('NaN')
    expect(formatNumber(Number.POSITIVE_INFINITY)).toBe('∞')
    expect(formatNumber(Number.NEGATIVE_INFINITY)).toBe('−∞')
  })
})
