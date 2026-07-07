# Prompts & AI Workflow Log

Per the assessment's "share any prompts that you used" instruction, this file logs the
prompts and key decisions behind the build.

I used Claude Code (Opus 4.8) to accelerate this build — scaffolding, boilerplate, and a first
implementation pass — while making the important decisions myself and writing and refining parts of
the code by hand. Claude was directed as a senior engineer coordinating three focused passes: the Go
backend, the React frontend, and QA/verification.

## 1. Assessment framing

Build a full-stack calculator: React (TypeScript) frontend consuming a Go REST backend
microservice. Basic + advanced arithmetic, input validation and edge-case handling
(division by zero, invalid data), unit tests + coverage on both layers, documentation, and
an optional Dockerfile for full-stack deployment.

## 2. Key decisions I made

React, TypeScript, and Go were fixed by the brief (React required; TypeScript and Go preferred). The
decisions I made within and around those:

- **Build tooling:** Vite, not Next.js, for the React app — a UI that only calls a Go API needs no
  SSR, file-based routing, or second (Node) backend; Go's standard-library `net/http`, no web framework.
- **Operations:** all seven — add, subtract, multiply, divide, power, square root, percentage.
- **API:** per-operation REST endpoints under `/api/v1`, plus a `/evaluate` endpoint that owns full
  expression parsing (see `docs/API_CONTRACT.md`).
- **Evaluation:** full PEMDAS — parentheses, right-associative `^`, unary minus — on the backend via
  the shunting-yard (two-stack) algorithm; the frontend never computes locally.
- **Styling / icons:** Tailwind CSS; `@phosphor-icons/react` (no hand-authored SVGs, no emojis).
- **Tests:** Vitest + React Testing Library (frontend); table-driven `go test` + a fuzz test (backend).
- **UI:** a Google-style keypad — simple, responsive, two-line display, physical-keyboard support.

## 3. Specialist agent prompts

Three specialist sub-agents were dispatched with precise, self-contained specs. The full behavioural
contract they were held to lives in [`docs/API_CONTRACT.md`](./docs/API_CONTRACT.md); the prompts are
summarised below.

### 3.1 Go backend expert

> Senior Go engineer. Build the backend in `backend/`, standard library only (`net/http` with the Go
> 1.22+ `ServeMux` method+path patterns), module `sezzle-calculator`. Layout: `cmd/server/main.go`,
> `internal/calculator` (pure ops + sentinel errors), `internal/expression` (tokenizer +
> **shunting-yard** infix→RPN + RPN value-stack eval), `internal/api` (handlers, router, middleware).
>
> `calculator`: `Add/Subtract/Multiply/Divide/Power/Sqrt/Percentage` on `float64`; sentinel errors
> `ErrDivisionByZero`, `ErrNegativeSquareRoot`, `ErrNonFiniteResult`; guard every result for `NaN`/`Inf`.
>
> `expression`: `Evaluate(string) (float64, error)` via shunting-yard. Explicit operator-precedence
> table (higher binds tighter): `+ -` = 2, `* /` = 3, unary minus = 4, `^` = 5 (right-assoc),
> prefix `√` = 6, postfix `%` = 7. Unary vs binary `-` resolved by tracking the previous
> operand-ender. Errors: empty / unbalanced parentheses / invalid expression, plus propagated
> domain sentinels. Full worked cases and error strings per `docs/API_CONTRACT.md`.
>
> `api`: per-operation endpoints + `/evaluate` + `/health`; operands decoded as `*float64` so a
> missing field is rejected (not defaulted to `0`); sentinel→400 via `errors.Is`; recover / logging /
> CORS middleware. **No swallowed errors, minimal comments, gofmt/vet clean.**
>
> Tests: table-driven for every op and every error path; `httptest` for each endpoint; a
> `FuzzEvaluate` fuzz test asserting the evaluator never panics and never returns a non-finite result.
> Report coverage, vet/build status, and fuzz results.

### 3.2 React frontend expert

> Senior frontend engineer. Build the frontend in `frontend/`: Vite + React + TypeScript + Tailwind +
> `@phosphor-icons/react`, tested with Vitest + React Testing Library. It calls exactly one endpoint,
> `POST /api/v1/evaluate`, and **never computes math locally**.
>
> Google-style keypad: two-line display; keys for digits, `.`, `+ − × ÷`, `^`, `√`, `%`, `( )`, `AC`,
> backspace, `=`. Keep the expression internally in parser-canonical form (`* / -`) and only prettify
> to `× ÷ −` for display. Physical-keyboard support; real `<button>`s with `aria-label`s; responsive;
> dark mode; a tasteful violet (Sezzle) accent. **Icons from phosphor only — no emojis, no hand-authored SVGs.**
>
> Structure: `api/calculatorClient` (throws on non-2xx *and* network failure — no empty catch),
> `hooks/useCalculator` (canonical state machine + continue-from-result), presentational components,
> `lib/format` (prettify + number formatting). Client-side guards for UX only; the backend is the
> source of truth. Tests must prove the canonical `/` (not `÷`) is sent, backend errors render, and
> network failures are handled. Report build, tests, and coverage.

### 3.3 QA engineer

> Senior QA engineer. Verify both layers against `docs/API_CONTRACT.md`. QA only — do not modify
> non-test source (report bugs instead); may add/strengthen test files.
>
> 1. Backend: run tests + coverage, run `FuzzEvaluate` briefly, fill only genuinely valuable gaps.
> 2. **Live HTTP integration smoke:** build & run the server, then `curl` every endpoint (per-op
>    success + errors, `/evaluate` PEMDAS + error cases, `/health`, 405/404, CORS preflight) and
>    assert status + body match the contract exactly; kill the server after.
> 3. Frontend: run tests + coverage; confirm the canonical-symbol, error-render, and network-failure
>    behaviours are proven.
> 4. **Contract alignment audit:** confirm the characters the UI can emit are exactly those the Go
>    tokenizer accepts — no orphaned operator, no rejected character.
>
> Report coverage on both layers, per-group PASS/FAIL for the smoke, gaps filled, and any bugs found.

_Result: backend 93.7% coverage, frontend 100%, 29/29 integration checks passing, fuzz clean, exact
frontend↔backend contract symmetry, zero bugs found._

## 4. Follow-up prompts (iteration)

The three passes were refined with shorter, directed prompts in the same session:

- **Implicit multiplication (UX bug found while testing):** pressing `(` after a number did
  nothing — the input guard blocked implicit multiplication. Prompt: make it behave like
  Google's calculator — auto-insert `*` when a value is followed by `(` or `√`, or a digit
  follows `)`/`%` — and cover it with tests.
- **Favicon:** add a favicon from the Phosphor set without committing an image asset —
  render the `CalculatorIcon` component at runtime and install its markup as a data-URI
  icon, with a test.
- **Contract correction:** a final review found the documented `√`/`%` precedence
  contradicted the implementation for `√4%`. Prompt: align the contract with the code and
  pin the case with a test.
- **Deployment:** write multi-stage Dockerfiles (static Go binary → distroless non-root;
  Vite build → nginx serving the SPA and reverse-proxying `/api`) plus docker-compose with
  overridable host ports.
- **Documentation:** README, `COVERAGE.md`, and `IMPROVEMENTS.md` drafted from the build
  context and refined by hand; the framing and final wording are mine.
