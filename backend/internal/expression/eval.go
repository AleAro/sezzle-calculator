package expression

import (
	"math"

	"sezzle-calculator/internal/calculator"
)

// evalRPN evaluates a token slice in Reverse Polish Notation using a value
// stack, delegating arithmetic to the calculator package.
func evalRPN(rpn []token) (float64, error) {
	var stack []float64
	for _, tok := range rpn {
		switch tok.kind {
		case tkNumber:
			stack = append(stack, tok.value)
		case tkPlus, tkMinus, tkStar, tkSlash, tkCaret:
			if len(stack) < 2 {
				return 0, ErrInvalidExpression
			}
			b := stack[len(stack)-1]
			a := stack[len(stack)-2]
			stack = stack[:len(stack)-2]
			result, err := applyBinary(tok.kind, a, b)
			if err != nil {
				return 0, err
			}
			stack = append(stack, result)
		case tkNeg:
			if len(stack) < 1 {
				return 0, ErrInvalidExpression
			}
			a := stack[len(stack)-1]
			result := -a
			if math.IsInf(result, 0) || math.IsNaN(result) {
				return 0, calculator.ErrNonFiniteResult
			}
			stack[len(stack)-1] = result
		case tkSqrt:
			if len(stack) < 1 {
				return 0, ErrInvalidExpression
			}
			result, err := calculator.Sqrt(stack[len(stack)-1])
			if err != nil {
				return 0, err
			}
			stack[len(stack)-1] = result
		case tkPercent:
			if len(stack) < 1 {
				return 0, ErrInvalidExpression
			}
			result := stack[len(stack)-1] / 100
			if math.IsInf(result, 0) || math.IsNaN(result) {
				return 0, calculator.ErrNonFiniteResult
			}
			stack[len(stack)-1] = result
		default:
			return 0, ErrInvalidExpression
		}
	}
	if len(stack) != 1 {
		return 0, ErrInvalidExpression
	}
	return stack[0], nil
}

// applyBinary dispatches a binary RPN operator to the calculator package,
// propagating any domain error unchanged.
func applyBinary(k tokenKind, a, b float64) (float64, error) {
	switch k {
	case tkPlus:
		return calculator.Add(a, b)
	case tkMinus:
		return calculator.Subtract(a, b)
	case tkStar:
		return calculator.Multiply(a, b)
	case tkSlash:
		return calculator.Divide(a, b)
	case tkCaret:
		return calculator.Power(a, b)
	default:
		return 0, ErrInvalidExpression
	}
}
