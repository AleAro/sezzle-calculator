# Sezzle Calculator

A full-stack calculator: a **React + TypeScript** frontend consuming a **Go REST** backend.
The backend evaluates whole arithmetic expressions with correct operator precedence (PEMDAS),
and **all arithmetic runs server-side** — the frontend only builds an expression string and
renders the result.

## Features

- **Operations:** add, subtract, multiply, divide, exponentiation (`^`), square root (`√`), percentage (`%`).
- **Full PEMDAS:** parentheses, right-associative `^`, unary minus, and correct precedence — e.g. `2 + 3 * 4 = 14`, `(2 + 3) * 4 ^ 2 = 80`.
- **Explicit edge-case handling:** division by zero, square root of a negative, empty/invalid input, unbalanced parentheses, and numeric overflow — each returns a clear `400` with a message.
- **Google-style keypad UI:** two-line display, physical-keyboard support, responsive layout, dark mode, and accessible controls.
- **Well-tested:** table-driven Go tests + a fuzz test on the evaluator; Vitest + React Testing Library on the UI. 93.7% backend / 100% frontend statement coverage.
- **One-command Docker deployment.**

## Architecture

```
Browser (React SPA)
    |  POST /api/v1/evaluate   { "expression": "(2+3)*4^2" }
    v
Go backend (net/http)
    |-- /api/v1/evaluate                       tokenize -> shunting-yard -> RPN eval   (owns PEMDAS)
    \-- /api/v1/{add,subtract,...,sqrt}         direct calculator functions
```

In Docker, **nginx** serves the built SPA and reverse-proxies `/api/` to the backend, so the browser
talks to a single origin (no CORS in production). In local development, Vite's dev server proxies
`/api` to the Go server on `:8080`.

## Tech stack

| Layer | Choices |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, `@phosphor-icons/react`; Vitest + React Testing Library |
| Backend | Go (**standard library only** — `net/http`); `go test` (table-driven) + native fuzzing |
| Deploy | Multi-stage Docker builds, docker-compose; nginx serves the SPA + proxies the API |

## Project structure

```
.
├── backend/
│   ├── cmd/server/main.go          # process entry: config + HTTP server
│   ├── internal/
│   │   ├── calculator/             # pure arithmetic + sentinel errors (100% covered)
│   │   ├── expression/             # tokenizer + shunting-yard + RPN eval + fuzz test
│   │   └── api/                    # handlers, router, middleware (CORS/recover/logging)
│   ├── go.mod
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/calculatorClient.ts # POSTs to /api/v1/evaluate; never computes locally
│   │   ├── hooks/useCalculator.ts  # canonical-expression state machine
│   │   ├── components/             # Display, Keypad, CalculatorKey
│   │   ├── lib/format.ts           # display prettify + number formatting
│   │   └── App.tsx
│   ├── nginx.conf
│   └── Dockerfile
├── docs/API_CONTRACT.md            # single source of truth shared by both layers
├── docker-compose.yml
├── PROMPTS.md                      # AI prompts used to build this (per the brief)
└── README.md
```

## Getting started

**Prerequisites:** Go 1.24+, Node 20.19+ / 22.12+ (Node 22 LTS recommended), and — for the container path — Docker.

### Option A — Docker (one command)

```bash
docker compose up --build
```

- App: <http://localhost:3000>
- API: <http://localhost:8080>

Stop with `docker compose down`. If `3000`/`8080` are already in use, override the host ports:
`APP_PORT=8088 API_PORT=8081 docker compose up --build`.

### Option B — Run locally (two terminals)

**Backend** (`:8080`):

```bash
cd backend
go run ./cmd/server          # override the port with PORT=9000 go run ./cmd/server
```

**Frontend** (`:5173`, proxies `/api` → `:8080`):

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>.

## API

Base path `/api/v1`. Requests and responses are JSON. Success is `200 {"result": <number>}`;
a validation or domain error is `400 {"error": "<message>"}`. See `docs/API_CONTRACT.md` for the full contract.

### Endpoints

| Method | Path | Body | Result |
|---|---|---|---|
| POST | `/api/v1/add` | `{"a","b"}` | `a + b` |
| POST | `/api/v1/subtract` | `{"a","b"}` | `a - b` |
| POST | `/api/v1/multiply` | `{"a","b"}` | `a * b` |
| POST | `/api/v1/divide` | `{"a","b"}` | `a / b` (guards `b == 0`) |
| POST | `/api/v1/power` | `{"a","b"}` | `a ^ b` |
| POST | `/api/v1/percentage` | `{"a","b"}` | `(a / 100) * b` |
| POST | `/api/v1/sqrt` | `{"value"}` | `√value` (guards `value < 0`) |
| POST | `/api/v1/evaluate` | `{"expression"}` | full expression with PEMDAS |
| GET | `/health` | — | `{"status":"ok"}` |

### Examples

```bash
# Full expression with precedence and parentheses
curl -X POST http://localhost:8080/api/v1/evaluate \
  -H 'Content-Type: application/json' -d '{"expression":"(2+3)*4^2"}'
# {"result":80}

# A single operation
curl -X POST http://localhost:8080/api/v1/divide \
  -H 'Content-Type: application/json' -d '{"a":10,"b":4}'
# {"result":2.5}

# Guarded error
curl -X POST http://localhost:8080/api/v1/divide \
  -H 'Content-Type: application/json' -d '{"a":10,"b":0}'
# {"error":"division by zero"}

# Square root of a negative
curl -X POST http://localhost:8080/api/v1/sqrt \
  -H 'Content-Type: application/json' -d '{"value":-4}'
# {"error":"cannot take the square root of a negative number"}
```

### Error messages

`invalid request body` · `operand 'a' is required` · `division by zero` ·
`cannot take the square root of a negative number` · `result is not a finite number` ·
`expression is empty` · `invalid expression` · `unbalanced parentheses`.

## Testing & coverage

**Backend** (table-driven tests + fuzzing):

```bash
cd backend
go test ./... -cover
go test ./... -coverprofile=coverage.out && go tool cover -html=coverage.out   # visual report
go test ./internal/expression -run=^$ -fuzz=FuzzEvaluate -fuzztime=30s          # robustness
```

Coverage: `calculator` **100%**, `expression` **95.2%**, `api` **98.8%** — **93.7% total**.
The fuzz test asserts the evaluator never panics and never returns a non-finite result on any input.

**Frontend** (Vitest + React Testing Library):

```bash
cd frontend
npm test
npm run coverage
```

Coverage: **100%** (statements, branches, functions, lines) across all application logic.
Full breakdown: [`COVERAGE.md`](./COVERAGE.md).

**What's covered**

- **Backend** — every operation and its error paths (÷0, √ of a negative, overflow); the full
  expression grammar (precedence, associativity, parentheses, unary `-`, `√`, `%`) and its error
  cases; every HTTP endpoint's success *and* error responses; plus a fuzz test proving the evaluator
  never panics.
- **Frontend** — the API client (success, backend errors, network failures); the input state machine
  (guards, implicit `×`, continue-from-result); display rendering; keypad → canonical-token mapping;
  and end-to-end flows including keyboard input.

## Design decisions

_The brief fixed the stack — React (required), with TypeScript and Go both **preferred**. Those weren't mine to decide; the choices below are the ones I actually made within and around them._

- **The backend owns all arithmetic — including precedence.** The `/evaluate` endpoint tokenizes and
  evaluates the whole expression, so the frontend stays a thin client and the math has a single,
  server-side source of truth that is unit- and fuzz-tested in Go. The per-operation endpoints
  (`/add`, `/divide`, …) expose the same core functions for direct, granular API use.

- **Shunting-yard evaluator.** The expression evaluator uses Dijkstra's shunting-yard (two-stack)
  algorithm: tokenize → convert infix to RPN with an explicit operator-precedence table → evaluate
  the RPN with a value stack. It was chosen for **explainability** (it maps to the "train shunting"
  mental model) and for being a single, table-driven algorithm. The known trade-off is that unary
  minus, prefix `√`, postfix `%`, and right-associative `^` each need explicit special-casing — so
  that risk is mitigated with a **fuzz test** proving the evaluator never panics or leaks a
  non-finite result. (Both shunting-yard and a recursive-descent parser are `O(n)`; the choice was
  about clarity, not complexity.)

- **Explicit validation, no swallowed errors.** Operands are decoded as pointers so a *missing*
  field is distinguished from a legitimate `0`. Domain failures are sentinel errors mapped to `400`
  via `errors.Is`, and every result is checked for `NaN`/`Inf`. No empty `catch`/error-swallowing on
  either side.

- **Go standard library only.** `net/http` with the Go 1.22+ `ServeMux` (method + path patterns)
  covers routing and middleware without a framework dependency.

- **The frontend never computes locally.** It keeps a canonical expression string (`* / -` internally)
  and only maps to display glyphs (`× ÷ −`) for rendering; on `=` it POSTs the canonical string and
  shows the result or the backend's error verbatim.

- **Vite, not Next.js.** The React frontend is a given; since the UI only calls a Go API it has no
  need for SSR, file-based routing, or a second (Node) backend — so a plain Vite SPA, not Next.js.

- **Vitest + React Testing Library.** Vitest runs the tests through the same Vite pipeline as the app
  — no separate Jest/Babel config to keep in sync — with a Jest-compatible API so they read
  conventionally, and it's fast. React Testing Library keeps assertions on what the user sees, not
  component internals.

- **Tailwind and Phosphor.** Tailwind builds the responsive, dark-mode UI without a stylesheet that
  drifts from the markup; Phosphor gives one consistent icon set (no hand-drawn SVGs or emojis).

- **Docker uses an nginx reverse proxy.** Serving the SPA and proxying `/api` from one origin removes
  CORS from production; CORS is enabled only for the Vite dev server.

## Assumptions

- `percentage(a, b)` is "**a** percent of **b**" = `(a / 100) * b`. In a typed expression the postfix
  `%` means `÷ 100`, which is consistent: `b * a%` equals `a% of b`.
- Evaluation respects PEMDAS with parentheses, right-associative `^`, and unary minus.
- Numbers are IEEE-754 `float64`; any non-finite result (overflow / undefined) is rejected as an error
  rather than returned.
- The API takes explicit operators (`2*(3)`, not `2(3)`); the web UI auto-inserts a `×` when a group opens right after a value (Google-style implicit multiplication).

Known limitations and future work are tracked in [`IMPROVEMENTS.md`](./IMPROVEMENTS.md).

## AI-assisted development

Per the brief's invitation to use AI tooling, I used Claude Code to accelerate this build —
scaffolding, boilerplate, and a first implementation pass across the backend, frontend, and tests. The
important decisions were mine (the architecture, the shunting-yard evaluation approach, the API shape,
the validation strategy, and the tooling), and parts of the code were written and refined by hand. The
prompts are recorded in [`PROMPTS.md`](./PROMPTS.md). Also, most of the documentation was written by claude code, refined by hand
