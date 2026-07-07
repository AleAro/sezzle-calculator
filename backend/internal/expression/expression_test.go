package expression_test

import (
	"errors"
	"math"
	"testing"

	"sezzle-calculator/internal/calculator"
	"sezzle-calculator/internal/expression"
)

func TestEvaluate(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		want    float64
		wantErr error
	}{
		// Precedence and associativity.
		{"multiplication before addition", "2+3*4", 14, nil},
		{"parentheses override precedence", "(2+3)*4", 20, nil},
		{"power is right associative", "2^3^2", 512, nil},
		{"unary minus binds looser than power", "-3^2", -9, nil},
		{"parenthesized negative base", "(-3)^2", 9, nil},
		{"multiply by unary minus", "2*-3", -6, nil},
		{"negative exponent", "2^-1", 0.5, nil},
		// Left-associativity of same-precedence binary operators (chained '-' and
		// '/' distinguish left- from right-associative grouping; '+'/'*' would not).
		{"left-associative subtraction chain", "10-3-2", 5, nil},
		{"left-associative division chain", "8/4/2", 1, nil},
		// Square root and percent.
		{"square root", "√9", 3, nil},
		{"square root of parenthesized sum", "√(4+5)", 3, nil},
		{"square root binds tighter than power", "√4^2", 4, nil},
		{"percent of a product", "200*10%", 20, nil},
		{"bare percent", "50%", 0.5, nil},
		{"percent then subtract", "50%-10", -9.5, nil},
		{"percent binds tighter than square root", "√4%", 0.2, nil},
		// Unary sign handling.
		{"redundant unary plus", "2++3", 5, nil},
		{"double negation", "--5", 5, nil},
		// Number parsing and whitespace.
		{"leading decimal point", ".5", 0.5, nil},
		{"whitespace is skipped", "  2 +\t3 ", 5, nil},
		// Domain errors propagated from the calculator package.
		{"division by zero", "10/0", 0, calculator.ErrDivisionByZero},
		{"square root of a negative", "√-4", 0, calculator.ErrNegativeSquareRoot},
		{"overflow is non-finite", "10^400", 0, calculator.ErrNonFiniteResult},
		// Parsing errors.
		{"empty input", "", 0, expression.ErrEmptyExpression},
		{"whitespace only", "   ", 0, expression.ErrEmptyExpression},
		{"trailing operator", "2+", 0, expression.ErrInvalidExpression},
		{"leading binary operator", "*2", 0, expression.ErrInvalidExpression},
		{"unclosed parenthesis", "(1+2", 0, expression.ErrUnbalancedParentheses},
		{"extra closing parenthesis", "1+2)", 0, expression.ErrUnbalancedParentheses},
		{"empty parentheses", "()", 0, expression.ErrInvalidExpression},
		{"double decimal point", "3.1.4", 0, expression.ErrInvalidExpression},
		{"invalid rune", "@", 0, expression.ErrInvalidExpression},
		{"sqrt with no operand", "√", 0, expression.ErrInvalidExpression},
		{"percent with no operand", "%", 0, expression.ErrInvalidExpression},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := expression.Evaluate(tt.input)
			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("Evaluate(%q) error = %v, want %v", tt.input, err, tt.wantErr)
			}
			if tt.wantErr == nil && math.Abs(got-tt.want) > 1e-9 {
				t.Fatalf("Evaluate(%q) = %v, want %v", tt.input, got, tt.want)
			}
		})
	}
}

// TestSentinelMessages pins the exact parsing error strings, which are part of
// the shared API contract asserted by both backend and frontend.
func TestSentinelMessages(t *testing.T) {
	cases := []struct {
		err  error
		want string
	}{
		{expression.ErrEmptyExpression, "expression is empty"},
		{expression.ErrUnbalancedParentheses, "unbalanced parentheses"},
		{expression.ErrInvalidExpression, "invalid expression"},
	}
	for _, c := range cases {
		if c.err.Error() != c.want {
			t.Errorf("message = %q, want %q", c.err.Error(), c.want)
		}
	}
}
