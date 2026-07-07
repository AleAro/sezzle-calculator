# Coverage report

Numbers below come from `go test -cover` and `vitest --coverage`; regenerate them (and the HTML
drill-downs) with the commands in the [README](./README.md#testing--coverage).

## Backend (Go)

| Package | Statement coverage |
|---|---|
| `internal/calculator` | 100.0% |
| `internal/expression` | 95.2% |
| `internal/api` | 98.8% |
| `cmd/server` | — (`main` wiring only; no unit surface) |
| **Total** | **93.7%** |

The remaining `expression` / `api` lines are defensive, unreachable branches (a JSON-encode failure,
the `500` fallback, `default:` arms for token kinds that can't reach evaluation) — verified by hand,
not left untested by omission. On top of that, a fuzz test (`FuzzEvaluate`, ~7M executions, 0 crashes)
proves the evaluator never panics or returns a non-finite result.

## Frontend (React)

**100%** — statements, branches, functions, and lines — across all application logic:
`App`, `calculatorClient`, `useCalculator`, `format`, `Display`, `Keypad`, `CalculatorKey`.
Only `main.tsx` (bootstrap) and `types.ts` (types only) sit outside the instrumented set.

## Regenerate

```bash
# Backend — coverage profile + HTML drill-down
cd backend && go test ./... -coverprofile=coverage.out && go tool cover -html=coverage.out

# Frontend — text summary + HTML in frontend/coverage/
cd frontend && npm run coverage
```
