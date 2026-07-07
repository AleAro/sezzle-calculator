// Package calculator provides pure arithmetic operations on float64 values.
// Every operation validates its result and reports domain failures through
// exported sentinel errors rather than panicking or returning NaN/Inf.
package calculator

import (
	"errors"
	"math"
)

// Domain sentinel errors. Callers compare against these with errors.Is.
var (
	ErrDivisionByZero     = errors.New("division by zero")
	ErrNegativeSquareRoot = errors.New("cannot take the square root of a negative number")
	ErrNonFiniteResult    = errors.New("result is not a finite number")
)

// finite guards a computed result, converting NaN/Inf into ErrNonFiniteResult.
func finite(result float64) (float64, error) {
	if math.IsInf(result, 0) || math.IsNaN(result) {
		return 0, ErrNonFiniteResult
	}
	return result, nil
}

func Add(a, b float64) (float64, error) { return finite(a + b) }

func Subtract(a, b float64) (float64, error) { return finite(a - b) }

func Multiply(a, b float64) (float64, error) { return finite(a * b) }

// Divide returns a / b, or ErrDivisionByZero when b is zero.
func Divide(a, b float64) (float64, error) {
	if b == 0 {
		return 0, ErrDivisionByZero
	}
	return finite(a / b)
}

// Power returns a raised to the exponent b.
func Power(a, b float64) (float64, error) { return finite(math.Pow(a, b)) }

// Sqrt returns the square root of value, or ErrNegativeSquareRoot when value < 0.
func Sqrt(value float64) (float64, error) {
	if value < 0 {
		return 0, ErrNegativeSquareRoot
	}
	return finite(math.Sqrt(value))
}

// Percentage returns "a percent of b", i.e. (a / 100) * b.
func Percentage(a, b float64) (float64, error) { return finite((a / 100) * b) }
