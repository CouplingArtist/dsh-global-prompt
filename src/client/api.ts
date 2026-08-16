/**
 * HTTP implementation of the editor IO boundary: talks to the host half's
 * `/api/global-prompt` route. Untested wiring — the editor tests inject a fake
 * api; the real route is verified by the install/run check (seam 3).
 */
import type { GlobalPromptApi, GlobalPromptLoadResult } from './GlobalPromptEditor'

const ENDPOINT = '/api/global-prompt'

interface ErrorPayload {
  error?: string
}

async function request(method: string, body?: unknown): Promise<unknown> {
  const response = await fetch(ENDPOINT, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  let payload: unknown = null
  try {
    payload = await response.json()
  } catch {
    // Empty or non-JSON body: keep null, the status decides below.
  }
  if (!response.ok) {
    const message = (payload as ErrorPayload | null)?.error ?? `HTTP ${response.status}`
    throw new Error(message)
  }
  return payload
}

export function createHttpApi(): GlobalPromptApi {
  return {
    async load() {
      return (await request('GET')) as GlobalPromptLoadResult
    },
    async save(content) {
      await request('PUT', { content })
    },
  }
}
