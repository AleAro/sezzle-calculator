import type { EvaluateErrorResponse, EvaluateSuccessResponse } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''
const EVALUATE_ENDPOINT = `${API_BASE_URL}/api/v1/evaluate`

function isSuccessResponse(body: unknown): body is EvaluateSuccessResponse {
  return typeof body === 'object' && body !== null && typeof (body as { result?: unknown }).result === 'number'
}

function isErrorResponse(body: unknown): body is EvaluateErrorResponse {
  return typeof body === 'object' && body !== null && typeof (body as { error?: unknown }).error === 'string'
}

/**
 * Sends a canonical expression string to the backend and resolves with the numeric result.
 * All arithmetic happens server-side; this function only transports the request and
 * translates the response into either a resolved number or a thrown Error.
 */
export async function evaluate(expression: string): Promise<number> {
  let response: Response

  try {
    response = await fetch(EVALUATE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expression }),
    })
  } catch {
    throw new Error('Could not reach the calculator service. Check your connection and try again.')
  }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new Error('The calculator service returned an unreadable response.')
  }

  if (!response.ok) {
    throw new Error(isErrorResponse(body) ? body.error : `Request failed with status ${response.status}.`)
  }

  if (!isSuccessResponse(body)) {
    throw new Error('The calculator service returned an unexpected response.')
  }

  return body.result
}
