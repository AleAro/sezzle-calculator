package expression_test

import (
	"math"
	"testing"

	"sezzle-calculator/internal/expression"
)

// FuzzEvaluate asserts the core safety invariant: Evaluate must never panic and
// must never return a non-finite result (Inf/NaN) together with a nil error.
func FuzzEvaluate(f *testing.F) {
	seeds := []string{
		"2+3*4", "(2+3)*4", "2^3^2", "-3^2", "(-3)^2", "2*-3", "2^-1",
		"√9", "√(4+5)", "√4^2", "200*10%", "50%", "50%-10", "2++3", "--5",
		"10/0", "√-4", "", "   ", "2+", "*2", "(1+2", "1+2)", "()", "3.1.4",
		".5", "@", "1e400", "((((", "))))", "%%%", "√√√9", "-----1", "1..2",
	}
	for _, s := range seeds {
		f.Add(s)
	}
	f.Fuzz(func(t *testing.T, s string) {
		result, err := expression.Evaluate(s)
		if err == nil && (math.IsInf(result, 0) || math.IsNaN(result)) {
			t.Fatalf("finite invariant violated: %q -> %v", s, result)
		}
	})
}
