package api

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"sezzle-calculator/internal/calculator"
	"sezzle-calculator/internal/expression"
)

// Request and response bodies. Operand pointers distinguish "absent" (nil) from
// a supplied zero, so a missing operand is rejected instead of defaulting to 0.
type binaryRequest struct {
	A *float64 `json:"a"`
	B *float64 `json:"b"`
}

type unaryRequest struct {
	Value *float64 `json:"value"`
}

type evaluateRequest struct {
	Expression string `json:"expression"`
}

type resultResponse struct {
	Result float64 `json:"result"`
}

type errorResponse struct {
	Error string `json:"error"`
}

type statusResponse struct {
	Status string `json:"status"`
}

// writeJSON encodes payload as JSON with the given status code.
func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		log.Printf("api: failed to encode response: %v", err)
	}
}

// writeError writes a JSON {"error": message} body with the given status code.
func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, errorResponse{Error: message})
}

// decodeJSON decodes the request body into dst.
func decodeJSON(r *http.Request, dst any) error {
	return json.NewDecoder(r.Body).Decode(dst)
}

// writeCalcError maps a calculator error to a response: known domain sentinels
// become 400s carrying the sentinel message; anything else is a 500.
func writeCalcError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, calculator.ErrDivisionByZero),
		errors.Is(err, calculator.ErrNegativeSquareRoot),
		errors.Is(err, calculator.ErrNonFiniteResult):
		writeError(w, http.StatusBadRequest, err.Error())
	default:
		log.Printf("api: unexpected calculator error: %v", err)
		writeError(w, http.StatusInternalServerError, "internal server error")
	}
}

// handleBinary builds a handler for a two-operand calculator operation.
func handleBinary(op func(a, b float64) (float64, error)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req binaryRequest
		if err := decodeJSON(r, &req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		if req.A == nil {
			writeError(w, http.StatusBadRequest, "operand 'a' is required")
			return
		}
		if req.B == nil {
			writeError(w, http.StatusBadRequest, "operand 'b' is required")
			return
		}
		result, err := op(*req.A, *req.B)
		if err != nil {
			writeCalcError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, resultResponse{Result: result})
	}
}

// handleSqrt handles POST /api/v1/sqrt.
func handleSqrt(w http.ResponseWriter, r *http.Request) {
	var req unaryRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Value == nil {
		writeError(w, http.StatusBadRequest, "operand 'value' is required")
		return
	}
	result, err := calculator.Sqrt(*req.Value)
	if err != nil {
		writeCalcError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, resultResponse{Result: result})
}

// handleEvaluate handles POST /api/v1/evaluate. Every evaluation failure,
// including propagated domain errors, is reported as a 400.
func handleEvaluate(w http.ResponseWriter, r *http.Request) {
	var req evaluateRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	result, err := expression.Evaluate(req.Expression)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, resultResponse{Result: result})
}

// handleHealth handles GET /health.
func handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, statusResponse{Status: "ok"})
}
