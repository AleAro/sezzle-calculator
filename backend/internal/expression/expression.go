// Package expression evaluates full infix arithmetic expressions using the
// shunting-yard algorithm in three phases: tokenize the input, convert the
// infix token stream to Reverse Polish Notation, then evaluate the RPN with a
// value stack. Domain failures (division by zero, negative square root,
// non-finite results) are surfaced through the calculator package's sentinels.
package expression

import "errors"

// Parsing sentinel errors. Callers compare against these with errors.Is.
var (
	ErrEmptyExpression       = errors.New("expression is empty")
	ErrUnbalancedParentheses = errors.New("unbalanced parentheses")
	ErrInvalidExpression     = errors.New("invalid expression")
)

// Evaluate parses and evaluates an infix expression, returning its value.
func Evaluate(input string) (float64, error) {
	tokens, err := tokenize(input)
	if err != nil {
		return 0, err
	}
	if len(tokens) == 0 {
		return 0, ErrEmptyExpression
	}
	rpn, err := toRPN(tokens)
	if err != nil {
		return 0, err
	}
	return evalRPN(rpn)
}
