package api_test

import (
	"encoding/json"
	"math"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"sezzle-calculator/internal/api"
)

func execute(t *testing.T, method, path, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	api.NewRouter().ServeHTTP(rec, req)
	return rec
}

func resultOf(t *testing.T, rec *httptest.ResponseRecorder) float64 {
	t.Helper()
	var resp struct {
		Result float64 `json:"result"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decoding result from %q: %v", rec.Body.String(), err)
	}
	return resp.Result
}

func errorOf(t *testing.T, rec *httptest.ResponseRecorder) string {
	t.Helper()
	var resp struct {
		Error string `json:"error"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decoding error from %q: %v", rec.Body.String(), err)
	}
	return resp.Error
}

func TestBinaryEndpointsSuccess(t *testing.T) {
	tests := []struct {
		path string
		body string
		want float64
	}{
		{"/api/v1/add", `{"a":2,"b":3}`, 5},
		{"/api/v1/subtract", `{"a":5,"b":3}`, 2},
		{"/api/v1/multiply", `{"a":4,"b":3}`, 12},
		{"/api/v1/divide", `{"a":10,"b":2}`, 5},
		{"/api/v1/power", `{"a":2,"b":10}`, 1024},
		{"/api/v1/percentage", `{"a":10,"b":200}`, 20},
	}
	for _, tt := range tests {
		t.Run(tt.path, func(t *testing.T) {
			rec := execute(t, http.MethodPost, tt.path, tt.body)
			if rec.Code != http.StatusOK {
				t.Fatalf("status = %d, want 200 (body %q)", rec.Code, rec.Body.String())
			}
			if got := resultOf(t, rec); math.Abs(got-tt.want) > 1e-9 {
				t.Fatalf("result = %v, want %v", got, tt.want)
			}
			if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
				t.Fatalf("Content-Type = %q, want application/json", ct)
			}
		})
	}
}

func TestBinaryEndpointErrors(t *testing.T) {
	tests := []struct {
		name       string
		path       string
		body       string
		wantStatus int
		wantError  string
	}{
		{"divide by zero", "/api/v1/divide", `{"a":10,"b":0}`, http.StatusBadRequest, "division by zero"},
		{"power overflow", "/api/v1/power", `{"a":10,"b":400}`, http.StatusBadRequest, "result is not a finite number"},
		{"missing a", "/api/v1/add", `{"b":3}`, http.StatusBadRequest, "operand 'a' is required"},
		{"missing b", "/api/v1/add", `{"a":3}`, http.StatusBadRequest, "operand 'b' is required"},
		{"malformed json", "/api/v1/add", `{"a":`, http.StatusBadRequest, "invalid request body"},
		{"not json", "/api/v1/add", `hello`, http.StatusBadRequest, "invalid request body"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := execute(t, http.MethodPost, tt.path, tt.body)
			if rec.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d (body %q)", rec.Code, tt.wantStatus, rec.Body.String())
			}
			if got := errorOf(t, rec); got != tt.wantError {
				t.Fatalf("error = %q, want %q", got, tt.wantError)
			}
		})
	}
}

func TestSqrtEndpoint(t *testing.T) {
	tests := []struct {
		name       string
		body       string
		wantStatus int
		wantResult float64
		wantError  string
	}{
		{"success", `{"value":9}`, http.StatusOK, 3, ""},
		{"negative", `{"value":-4}`, http.StatusBadRequest, 0, "cannot take the square root of a negative number"},
		{"missing value", `{}`, http.StatusBadRequest, 0, "operand 'value' is required"},
		{"malformed", `{`, http.StatusBadRequest, 0, "invalid request body"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := execute(t, http.MethodPost, "/api/v1/sqrt", tt.body)
			if rec.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d (body %q)", rec.Code, tt.wantStatus, rec.Body.String())
			}
			if tt.wantStatus == http.StatusOK {
				if got := resultOf(t, rec); math.Abs(got-tt.wantResult) > 1e-9 {
					t.Fatalf("result = %v, want %v", got, tt.wantResult)
				}
				return
			}
			if got := errorOf(t, rec); got != tt.wantError {
				t.Fatalf("error = %q, want %q", got, tt.wantError)
			}
		})
	}
}

func TestEvaluateEndpoint(t *testing.T) {
	tests := []struct {
		name       string
		body       string
		wantStatus int
		wantResult float64
		wantError  string
	}{
		{"success", `{"expression":"(2+3)*4^2"}`, http.StatusOK, 80, ""},
		{"division by zero", `{"expression":"1/0"}`, http.StatusBadRequest, 0, "division by zero"},
		{"unbalanced", `{"expression":"(1+2"}`, http.StatusBadRequest, 0, "unbalanced parentheses"},
		{"empty", `{"expression":""}`, http.StatusBadRequest, 0, "expression is empty"},
		{"malformed", `{`, http.StatusBadRequest, 0, "invalid request body"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := execute(t, http.MethodPost, "/api/v1/evaluate", tt.body)
			if rec.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d (body %q)", rec.Code, tt.wantStatus, rec.Body.String())
			}
			if tt.wantStatus == http.StatusOK {
				if got := resultOf(t, rec); math.Abs(got-tt.wantResult) > 1e-9 {
					t.Fatalf("result = %v, want %v", got, tt.wantResult)
				}
				return
			}
			if got := errorOf(t, rec); got != tt.wantError {
				t.Fatalf("error = %q, want %q", got, tt.wantError)
			}
		})
	}
}

func TestHealth(t *testing.T) {
	rec := execute(t, http.MethodGet, "/health", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	var resp struct {
		Status string `json:"status"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if resp.Status != "ok" {
		t.Fatalf("status = %q, want ok", resp.Status)
	}
	if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
		t.Fatalf("Content-Type = %q, want application/json", ct)
	}
}

func TestWrongMethod(t *testing.T) {
	rec := execute(t, http.MethodGet, "/api/v1/add", "")
	if rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("status = %d, want 405", rec.Code)
	}
}

func TestUnknownRoute(t *testing.T) {
	rec := execute(t, http.MethodPost, "/api/v1/unknown", `{}`)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", rec.Code)
	}
}

func TestCORSPreflight(t *testing.T) {
	rec := execute(t, http.MethodOptions, "/api/v1/add", "")
	if rec.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want 204", rec.Code)
	}
	if origin := rec.Header().Get("Access-Control-Allow-Origin"); origin == "" {
		t.Fatal("missing Access-Control-Allow-Origin header")
	}
}
