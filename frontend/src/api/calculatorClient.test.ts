import { afterEach, describe, expect, it, vi } from 'vitest'
import { evaluate } from './calculatorClient'

function jsonResponse(body: unknown, ok = true, status = ok ? 200 : 400) {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response
}

describe('calculatorClient.evaluate', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('POSTs the canonical expression as JSON and resolves with the numeric result', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ result: 14 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(evaluate('2+3*4')).resolves.toBe(14)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expression: '2+3*4' }),
    })
  })

  it('rejects with the backend error message verbatim on a 400 response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ error: 'division by zero' }, false, 400)))

    await expect(evaluate('1/0')).rejects.toThrow('division by zero')
  })

  it('rejects with a descriptive error when the network request itself fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    await expect(evaluate('1+1')).rejects.toThrow(/could not reach/i)
  })

  it('rejects with a fallback message when a success body has no numeric result', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({})))

    await expect(evaluate('1+1')).rejects.toThrow(/unexpected response/i)
  })

  it('rejects with the status code when a failed response has no error field', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, false, 500)))

    await expect(evaluate('1+1')).rejects.toThrow('500')
  })

  it('rejects gracefully when the response body is not valid JSON', async () => {
    const badResponse = {
      ok: true,
      status: 200,
      json: () => Promise.reject(new Error('Unexpected token')),
    } as unknown as Response
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(badResponse))

    await expect(evaluate('1+1')).rejects.toThrow(/unreadable response/i)
  })
})
