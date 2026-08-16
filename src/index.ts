/**
 * dsh-global-prompt host half: serves GET/PUT `/api/global-prompt` over the
 * web server and routes them to the user-global instructions file
 * (`$DSH_HOME/AGENTS.md`, which stays the single source of truth).
 *
 * The route is loopback-only: the settings UI runs on the same machine, and
 * this endpoint edits a file that shapes every session's context.
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import { readGlobalInstructions, resolveDshHome, writeGlobalInstructions } from './store'

export const name = 'global-prompt'

export const inject = ['webServer']

/** Same cap as the harness's per-source instruction limit: 1 MiB. */
const MAX_CONTENT_BYTES = 1024 * 1024

export interface WebRoute {
  kind: 'exact' | 'prefix'
  path: string
  handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>
}

export interface HostContext {
  webServer: { register(route: WebRoute): () => void }
  logger: { warn(format: string, ...args: unknown[]): void }
  effect(callback: () => (() => void) | void, name?: string): void
}

class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message)
  }
}

function isLoopback(req: IncomingMessage): boolean {
  const address = req.socket.remoteAddress ?? ''
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1'
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(payload))
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  let total = 0
  for await (const chunk of req) {
    const buffer = chunk as Buffer
    total += buffer.length
    if (total > MAX_CONTENT_BYTES) {
      throw new HttpError(413, `请求体超过 ${MAX_CONTENT_BYTES} 字节上限`)
    }
    chunks.push(buffer)
  }
  if (chunks.length === 0) return null
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw new HttpError(400, '请求体不是合法的 JSON')
  }
}

export function apply(ctx: HostContext): void {
  const dshHome = resolveDshHome(undefined)

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: '/api/global-prompt',
    handler: async (req, res) => {
      try {
        if (!isLoopback(req)) {
          sendJson(res, 403, { error: '该接口仅允许本机回环访问' })
          return
        }
        if (req.method === 'GET') {
          const snapshot = await readGlobalInstructions(dshHome)
          sendJson(res, 200, {
            exists: snapshot.exists,
            content: snapshot.content,
            displayPath: snapshot.displayPath,
          })
          return
        }
        if (req.method === 'PUT') {
          const payload = await readJsonBody(req)
          if (typeof payload !== 'object' || payload === null
            || typeof (payload as { content?: unknown }).content !== 'string') {
            sendJson(res, 400, { error: '请求体需要 { "content": string }' })
            return
          }
          await writeGlobalInstructions(dshHome, (payload as { content: string }).content)
          sendJson(res, 200, { ok: true })
          return
        }
        sendJson(res, 405, { error: `不支持的请求方法 ${req.method ?? ''}` })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (error instanceof HttpError) {
          sendJson(res, error.status, { error: message })
          return
        }
        ctx.logger.warn('global-prompt: %s', message)
        if (!res.headersSent) sendJson(res, 500, { error: message })
      }
    },
  }), 'global-prompt: http route')
}
