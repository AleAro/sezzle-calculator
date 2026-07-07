package calculator_test

import (
	"errors"
	"math"
	"testing"

	"sezzle-calculator/internal/calculator"
)

func TestBinaryOperations(t *testing.T) {
	tests := []struct {
		name    string
		op      func(a, b float64) (float64, error)
		a, b    float64
		want    float64
		wantErr error
	}{
		{"add", calculator.Add, 2, 3, 5, nil},
		{"add negatives", calculator.Add, -2, -3, -5, nil},
		{"add overflow", calculator.Add, math.MaxFloat64, math.MaxFloat64, 0, calculator.ErrNonFiniteResult},
		{"subtract", calculator.Subtract, 5, 3, 2, nil},
		{"subtract to negative", calculator.Subtract, 3, 5, -2, nil},
		{"multiply", calculator.Multiply, 4, 3, 12, nil},
		{"multiply by zero", calculator.Multiply, 4, 0, 0, nil},
		{"multiply overflow", calculator.Multiply, math.MaxFloat64, 2, 0, calculator.ErrNonFiniteResult},
		{"divide", calculator.Divide, 10, 2, 5, nil},
		{"divide by zero", calculator.Divide, 10, 0, 0, calculator.ErrDivisionByZero},
		{"divide zero by zero", calculator.Divide, 0, 0, 0, calculator.ErrDivisionByZero},
		{"power", calculator.Power, 2, 10, 1024, nil},
		{"power zero exponent", calculator.Power, 5, 0, 1, nil},
		{"power negative exponent", calculator.Power, 2, -1, 0.5, nil},
		{"power overflow", calculator.Power, 10, 400, 0, calculator.ErrNonFiniteResult},
		{"percentage", calculator.Percentage, 10, 200, 20, nil},
		{"percentage of one", calculator.Percentage, 50, 1, 0.5, nil},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := tt.op(tt.a, tt.b)
			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("error = %v, want %v", err, tt.wantErr)
			}
			if tt.wantErr == nil && math.Abs(got-tt.want) > 1e-9 {
				t.Fatalf("got %v, want %v", got, tt.want)
			}
		})
	}
}

func TestSqrt(t *testing.T) {
	tests := []struct {
		name    string
		value   float64
		want    float64
		wantErr error
	}{
		{"perfect square", 9, 3, nil},
		{"zero", 0, 0, nil},
		{"non-perfect square", 2, math.Sqrt2, nil},
		{"negative", -4, 0, calculator.ErrNegativeSquareRoot},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := calculator.Sqrt(tt.value)
			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("error = %v, want %v", err, tt.wantErr)
			}
			if tt.wantErr == nil && math.Abs(got-tt.want) > 1e-9 {
				t.Fatalf("got %v, want %v", got, tt.want)
			}
		})
	}
}

// TestSentinelMessages pins the exact error strings, which are part of the
// shared API contract asserted by both backend and frontend.
func TestSentinelMessages(t *testing.T) {
	cases := []struct {
		err  error
		want string
	}{
		{calculator.ErrDivisionByZero, "division by zero"},
		{calculator.ErrNegativeSquareRoot, "cannot take the square root of a negative number"},
		{calculator.ErrNonFiniteResult, "result is not a finite number"},
	}
	for _, c := range cases {
		if c.err.Error() != c.want {
			t.Errorf("message = %q, want %q", c.err.Error(), c.want)
		}
	}
}
