package api

// Internal (white-box) tests. The rest of the suite lives in the external
// api_test package and only exercises the router end-to-end; these two paths
// are not reachable through any current handler (no registered handler panics,
// and no calculator operation returns an error outside the three known
// sentinels), so they can only be pinned by calling the unexported helpers
// directly.

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

// TestRecoverMiddlewareRecoversPanic pins the contract's documented
// "Unexpected fault: 500 (recover middleware)" behavior against a synthetic
// panicking handler, since none of the real handlers panic in practice.
func TestRecoverMiddlewareRecoversPanic(t *testing.T) {
	panicking := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		panic("boom")
	})

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	recoverMiddleware(panicking).ServeHTTP(rec, req)

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusInternalServerError)
	}
	var resp errorResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decoding error body %q: %v", rec.Body.String(), err)
	}
	if resp.Error != "internal server error" {
		t.Fatalf("error = %q, want %q", resp.Error, "internal server error")
	}
}

// TestWriteCalcErrorUnknownError pins writeCalcError's fallback: any error
// that is not one of the three known domain sentinels is reported as a 500
// without leaking the underlying error message to the client.
func TestWriteCalcErrorUnknownError(t *testing.T) {
	rec := httptest.NewRecorder()
	writeCalcError(rec, errors.New("some unexpected internal failure"))

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusInternalServerError)
	}
	var resp errorResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decoding error body %q: %v", rec.Body.String(), err)
	}
	if resp.Error != "internal server error" {
		t.Fatalf("error = %q, want %q (must not leak the raw error message)", resp.Error, "internal server error")
	}
}
