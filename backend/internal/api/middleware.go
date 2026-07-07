package api

import (
	"log"
	"net/http"
	"os"
	"time"
)

const defaultAllowedOrigin = "http://localhost:5173"

// chain wraps h with the given middleware. The first middleware listed becomes
// the outermost layer.
func chain(h http.Handler, middlewares ...func(http.Handler) http.Handler) http.Handler {
	for i := len(middlewares) - 1; i >= 0; i-- {
		h = middlewares[i](h)
	}
	return h
}

// statusRecorder captures the response status code so it can be logged.
type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(status int) {
	r.status = status
	r.ResponseWriter.WriteHeader(status)
}

// loggingMiddleware logs the method, path, status code and duration of each
// request.
func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rec, r)
		log.Printf("%s %s %d %s", r.Method, r.URL.Path, rec.status, time.Since(start))
	})
}

// recoverMiddleware turns a panic in a downstream handler into a logged 500
// response instead of crashing the server.
func recoverMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				log.Printf("api: recovered from panic: %v", rec)
				writeError(w, http.StatusInternalServerError, "internal server error")
			}
		}()
		next.ServeHTTP(w, r)
	})
}

// corsMiddleware sets CORS headers and answers preflight OPTIONS requests with
// 204. The allowed origin comes from CORS_ALLOWED_ORIGIN, defaulting to the
// local Vite dev server.
func corsMiddleware(next http.Handler) http.Handler {
	origin := os.Getenv("CORS_ALLOWED_ORIGIN")
	if origin == "" {
		origin = defaultAllowedOrigin
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
