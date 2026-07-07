package expression

import "strconv"

// tokenKind enumerates the lexical categories produced by the tokenizer.
type tokenKind int

const (
	tkNumber  tokenKind = iota
	tkPlus              // binary +
	tkMinus             // binary -
	tkStar              // *
	tkSlash             // /
	tkCaret             // ^
	tkNeg               // unary minus
	tkSqrt              // prefix √
	tkPercent           // postfix %
	tkLParen            // (
	tkRParen            // )
)

// token is a single lexical unit; value is meaningful only for tkNumber.
type token struct {
	kind  tokenKind
	value float64
}

func isASCIISpace(r rune) bool {
	switch r {
	case ' ', '\t', '\n', '\r', '\v', '\f':
		return true
	default:
		return false
	}
}

func isDigitOrDot(r rune) bool {
	return (r >= '0' && r <= '9') || r == '.'
}

// tokenize converts input into a flat token slice. Unary plus/minus are
// resolved here by tracking whether the previous token can end an operand: a
// '+'/'-' that is not preceded by an operand-ender (NUMBER, ')' or '%') is
// unary. A unary '-' becomes tkNeg; a unary '+' is a no-op and is dropped.
func tokenize(input string) ([]token, error) {
	var tokens []token
	runes := []rune(input)
	operandEnder := false
	for i := 0; i < len(runes); {
		r := runes[i]
		switch {
		case isASCIISpace(r):
			i++
		case isDigitOrDot(r):
			start := i
			for i < len(runes) && isDigitOrDot(runes[i]) {
				i++
			}
			value, err := strconv.ParseFloat(string(runes[start:i]), 64)
			if err != nil {
				return nil, ErrInvalidExpression
			}
			tokens = append(tokens, token{kind: tkNumber, value: value})
			operandEnder = true
		case r == '+' || r == '-':
			if operandEnder {
				if r == '+' {
					tokens = append(tokens, token{kind: tkPlus})
				} else {
					tokens = append(tokens, token{kind: tkMinus})
				}
				operandEnder = false
			} else if r == '-' {
				tokens = append(tokens, token{kind: tkNeg})
			}
			// A unary '+' contributes no token.
			i++
		case r == '*':
			tokens = append(tokens, token{kind: tkStar})
			operandEnder = false
			i++
		case r == '/':
			tokens = append(tokens, token{kind: tkSlash})
			operandEnder = false
			i++
		case r == '^':
			tokens = append(tokens, token{kind: tkCaret})
			operandEnder = false
			i++
		case r == '(':
			tokens = append(tokens, token{kind: tkLParen})
			operandEnder = false
			i++
		case r == ')':
			tokens = append(tokens, token{kind: tkRParen})
			operandEnder = true
			i++
		case r == '√':
			tokens = append(tokens, token{kind: tkSqrt})
			operandEnder = false
			i++
		case r == '%':
			tokens = append(tokens, token{kind: tkPercent})
			operandEnder = true
			i++
		default:
			return nil, ErrInvalidExpression
		}
	}
	return tokens, nil
}
