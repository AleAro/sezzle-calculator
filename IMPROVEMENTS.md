# Potential improvements

Conscious scope calls for a 2–4 hour exercise, recorded with their intended fixes. None are
reachable in normal use; each would be a small, contained change.

## Known minor issues

1. **Keyboard handler captures browser shortcuts.** The global key handler (`App.tsx`,
   `handleKeyDown`) does not check `metaKey`/`ctrlKey`, so shortcuts that include a calculator
   character — e.g. Cmd+0 (reset zoom) or Cmd+`-` — insert `0`/`-` instead of reaching the browser.
   Fix: return early when a modifier key is held.
2. **An in-flight evaluation can overwrite newer state.** `useCalculator.ts` `evaluate()` applies the
   response unconditionally: pressing `=` and then clearing (or typing) before the response lands lets
   the late response restore the old expression and result. Unobservable at local latencies, but real.
   Fix: a request token compared on arrival, or an `AbortController` cancelled by `clear`/`inputKey`.
   Relatedly, the Enter key is not guarded by `isEvaluating` (the `=` button is), so a held Enter can
   double-submit — benign today (same expression, same result), but the token fix covers it too.
3. **Chaining continues from the displayed value.** After `=`, pressing an operator continues from the
   12-significant-digit formatted result (`formatNumber`), not the raw `float64`. Deliberate — what you
   see is what you compute with — but worth knowing; the alternative is carrying the raw value alongside
   the display string.

## Production hardening

- **Request-body limits:** wrap handlers with `http.MaxBytesReader` and cap expression length —
  defense-in-depth against oversized payloads.
- **Client timeout:** give `calculatorClient.evaluate` an `AbortController`-based timeout so a hung
  backend surfaces as an error instead of an indefinite pending state.
- **Graceful shutdown:** trap `SIGTERM`/`SIGINT` in `main.go` and call `srv.Shutdown(ctx)` so in-flight
  requests drain cleanly on deploys and `docker compose down`.
- **Container health:** add a `healthcheck` on the backend service (it already exposes `GET /health`)
  and gate the frontend with `depends_on: condition: service_healthy`.
- **Rate limiting:** a token-bucket middleware on `/api/v1/*` — it is a public compute endpoint.
- **Observability:** structured logging (`log/slog`) with request IDs, plus a metrics endpoint
  (request count/latency/error rate) once there is somewhere to scrape it.
- **Machine-readable error codes:** errors carry the HTTP status plus a human-readable message
  (`{"error": "division by zero"}`). Clients that need to branch or localize without matching message
  strings would benefit from a stable domain code (e.g. `"code": "division_by_zero"`) — or adopting
  RFC 9457 `application/problem+json` for fully structured errors.
- **Static favicon:** the icon is installed at runtime from the Phosphor component; browsers that
  request `/favicon.ico` before scripts run get a harmless miss. Serving a static fallback would
  remove that first-load request.

## Testing & tooling

- **CI pipeline:** `gofmt`/`go vet`/`go test -cover`, a short fuzz smoke, `npm test` with a coverage
  gate, and both Docker builds on every push.
- **End-to-end tests:** a small Playwright suite driving the composed stack (keypad → nginx → Go and
  back), covering the happy path and the visible error states.

## Product ideas

- Calculation history (tape) with tap-to-reuse.
- Memory keys (`M+`, `M-`, `MR`).
- Locale-aware decimal input (`,` as separator) mapped to the canonical `.` before sending.
