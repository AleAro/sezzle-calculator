# Calculator API Contract

Base path: `/api/v1` · Content-Type: `application/json` · Numbers are JSON numbers (Go `float64`).

This document is the single source of truth shared by the backend and frontend.

## Conventions

- **Success:** `200` with `{"result": <number>}`.
- **Client / validation / domain error:** `400` with `{"error": "<message>"}`.
- **Unknown route:** `404`. **Wrong method:** `405`. **Unexpected fault:** `500` (recover middleware).
- Operands are **required** — a missing operand is rejected explicitly, never defaulted to `0`.

## Per-operation endpoints

Discrete, directly consumable operations. The `/evaluate` endpoint below is built on the same core functions.

### Binary — request body `{"a": number, "b": number}`
| Method | Path | Meaning | Guarded error |
|---|---|---|---|
| POST | `/api/v1/add` | `a + b` | — |
| POST | `/api/v1/subtract` | `a - b` | — |
| POST | `/api/v1/multiply` | `a * b` | — |
| POST | `/api/v1/divide` | `a / b` | `b == 0` → `division by zero` |
| POST | `/api/v1/power` | `a ^ b` (base, exponent) | non-finite / overflow |
| POST | `/api/v1/percentage` | `(a / 100) * b` — "a percent of b" | — |

### Unary — request body `{"value": number}`
| Method | Path | Meaning | Guarded error |
|---|---|---|---|
| POST | `/api/v1/sqrt` | `sqrt(value)` | `value < 0` |

## Expression endpoint (powers the UI)

`POST /api/v1/evaluate` — body `{"expression": "(2 + 3) * 4 ^ 2"}` → `200 {"result": 80}`

The backend tokenizes and evaluates the whole expression with correct precedence. The frontend sends
the raw expression string and **never computes locally**.

### Accepted tokens
Digits & decimals · `+` `-` `*` `/` `^` · parentheses `(` `)` · prefix `√` · postfix `%` · unary minus `-`.
(The frontend displays `×` `÷` `−` but must **send** `*` `/` `-`.)

### Precedence (high → low)
1. Parentheses `( )`
2. Postfix `%` — applies to the value directly before it (`x%` = `x / 100`, so `√4%` = `√(4%)`)
3. Prefix `√`
4. `^` — right-associative
5. Unary minus `-x`
6. `*` `/`
7. `+` `-`

### Grammar (recursive descent)
```
expr    := term (('+' | '-') term)*
term    := unary (('*' | '/') unary)*
unary   := '-' unary | power
power   := postfix ('^' unary)?        // right-associative
postfix := primary ('%')*              // x% = x / 100
primary := number | '(' expr ')' | '√' unary
```

### Worked semantics
`2 + 3 * 4 = 14` · `(2 + 3) * 4 = 20` · `2 ^ 3 ^ 2 = 512` · `-3 ^ 2 = -9` · `2 * -3 = -6`
`√9 = 3` · `√(4 + 5) = 3` · `200 * 10% = 20` · `50% = 0.5` · `√4% = √(0.04) = 0.2`

## Health
`GET /health` → `200 {"status": "ok"}`

## Error messages (stable — asserted by tests on both sides)

| Condition | Message |
|---|---|
| Malformed JSON body | `invalid request body` |
| Missing binary operand | `operand 'a' is required` / `operand 'b' is required` |
| Missing unary operand | `operand 'value' is required` |
| Divide by zero | `division by zero` |
| Square root of a negative number | `cannot take the square root of a negative number` |
| Non-finite result (overflow / undefined) | `result is not a finite number` |
| Empty expression | `expression is empty` |
| Malformed expression | `invalid expression` |
| Unbalanced parentheses | `unbalanced parentheses` |

## Examples

```
POST /api/v1/divide      {"a": 10, "b": 2}            → 200 {"result": 5}
POST /api/v1/divide      {"a": 10, "b": 0}            → 400 {"error": "division by zero"}
POST /api/v1/sqrt        {"value": -4}                → 400 {"error": "cannot take the square root of a negative number"}
POST /api/v1/percentage  {"a": 10, "b": 200}          → 200 {"result": 20}
POST /api/v1/evaluate    {"expression": "2+3*4"}      → 200 {"result": 14}
POST /api/v1/evaluate    {"expression": "(2+3)*4^2"}  → 200 {"result": 80}
POST /api/v1/evaluate    {"expression": "1/0"}        → 400 {"error": "division by zero"}
POST /api/v1/evaluate    {"expression": "(1+2"}       → 400 {"error": "unbalanced parentheses"}
```

## Assumptions

- Standalone `percentage(a, b)` = "a percent of b" = `(a / 100) * b`; the expression-level postfix `%` means `÷100`,
  which is consistent: `b * a%` = `a% of b`.
- `√` is a prefix function; unary minus is supported.
- All arithmetic runs on the backend; the frontend never computes results locally.
- `float64` throughout; every result is checked for `NaN`/`Inf`.
