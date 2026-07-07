package api

import (
	"net/http"

	"sezzle-calculator/internal/calculator"
)

// NewRouter builds the HTTP handler with all routes registered and the
// middleware chain applied.
func NewRouter() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("POST /api/v1/add", handleBinary(calculator.Add))
	mux.HandleFunc("POST /api/v1/subtract", handleBinary(calculator.Subtract))
	mux.HandleFunc("POST /api/v1/multiply", handleBinary(calculator.Multiply))
	mux.HandleFunc("POST /api/v1/divide", handleBinary(calculator.Divide))
	mux.HandleFunc("POST /api/v1/power", handleBinary(calculator.Power))
	mux.HandleFunc("POST /api/v1/percentage", handleBinary(calculator.Percentage))
	mux.HandleFunc("POST /api/v1/sqrt", handleSqrt)
	mux.HandleFunc("POST /api/v1/evaluate", handleEvaluate)
	mux.HandleFunc("GET /health", handleHealth)

	// Outermost to innermost: logging observes the final status (including a
	// recovered 500); recover guards the handlers; CORS sets headers and
	// answers preflight.
	return chain(mux, loggingMiddleware, recoverMiddleware, corsMiddleware)
}
