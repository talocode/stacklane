import type { IncomingMessage, ServerResponse } from 'node:http'

export class HttpError extends Error {
  statusCode: number
  code: string
  details?: Record<string, unknown>

  constructor(statusCode: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}

export function sendJson(res: ServerResponse, statusCode: number, payload: unknown) {
  const apiOrigin = process.env.WEB_ORIGIN || 'http://localhost:3000'
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': apiOrigin,
    'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-allow-credentials': 'true'
  })
  res.end(JSON.stringify(payload))
}

export function sendData(res: ServerResponse, statusCode: number, data: unknown) {
  sendJson(res, statusCode, { data })
}

export function sendError(res: ServerResponse, error: HttpError) {
  sendJson(res, error.statusCode, {
    error: {
      code: error.code,
      message: error.message,
      details: error.details
    }
  })
}

export async function parseBody(req: IncomingMessage) {
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    let raw = ''
    req.on('data', (chunk) => {
      raw += chunk
    })
    req.on('end', () => {
      if (!raw) return resolve({})
      try {
        resolve(JSON.parse(raw) as Record<string, unknown>)
      } catch {
        reject(new HttpError(400, 'INVALID_JSON', 'Request body must be valid JSON.'))
      }
    })
    req.on('error', reject)
  })
}

export function parseCookies(req: IncomingMessage) {
  const rawCookie = req.headers.cookie || ''
  const pairs = rawCookie.split(';').map((part) => part.trim()).filter(Boolean)
  const output: Record<string, string> = {}
  for (const pair of pairs) {
    const [key, ...rest] = pair.split('=')
    output[key] = decodeURIComponent(rest.join('='))
  }
  return output
}

export function setSessionCookie(res: ServerResponse, token: string) {
  res.setHeader('Set-Cookie', `sl_session=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800`)
}

export function clearSessionCookie(res: ServerResponse) {
  res.setHeader('Set-Cookie', 'sl_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0')
}
