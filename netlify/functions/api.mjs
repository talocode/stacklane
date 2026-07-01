// Netlify Function entry point for Stacklane API
// Wraps the Node HTTP handler for Netlify Functions
// Uses dynamic import for the built server module (compiled to JS)

export const config = {
  path: '/*',
  preferStatic: true,
}

export async function handler(event, context) {
  let apiHandler

  try {
    // Try compiled output first (production)
    apiHandler = (await import('../../apps/api/dist/server.js')).handler
  } catch {
    try {
      // Fall back to tsx-transpiled source (development)
      apiHandler = (await import('../../apps/api/src/server.ts')).handler
    } catch {
      return {
        statusCode: 500,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          error: { code: 'MODULE_NOT_FOUND', message: 'API handler module could not be loaded.' },
        }),
      }
    }
  }

  const path = event.path
  const method = event.httpMethod
  const queryString = event.rawQuery || ''

  // Reconstruct Node.js-style IncomingMessage and ServerResponse
  // by creating a minimal Request and adapting the response

  const headers = new Headers()
  if (event.headers) {
    for (const [key, value] of Object.entries(event.headers)) {
      if (value) headers.set(key, value)
    }
  }

  const proto = headers.get('x-forwarded-proto') || 'https'
  const host = headers.get('host') || 'api.talocode.site'
  const url = `${proto}://${host}${path}${queryString ? '?' + queryString : ''}`

  const request = new Request(url, {
    method,
    headers,
    body: ['GET', 'HEAD', 'OPTIONS'].includes(method) ? undefined : (event.body || undefined),
  })

  return new Promise((resolve) => {
    const chunks = []
    let responseStatus = 200
    let responseHeaders = { 'content-type': 'application/json' }
    let responseSent = false

    const serverRes = {
      writeHead: (statusCode, headers) => {
        if (!responseSent) {
          responseStatus = statusCode
          if (headers) responseHeaders = { ...responseHeaders, ...headers }
        }
      },
      write: (chunk) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)))
      },
      end: (data) => {
        if (!responseSent) {
          responseSent = true
          if (data) chunks.push(Buffer.isBuffer(data) ? data : Buffer.from(String(data)))
          const body = Buffer.concat(chunks).toString('utf-8') || ''
          resolve({
            statusCode: responseStatus,
            headers: responseHeaders,
            body,
          })
        }
      },
      setHeader: (name, value) => { responseHeaders[name] = String(value) },
      getHeader: (name) => responseHeaders[name],
      statusCode: 200,
    }

    apiHandler(request, serverRes).catch((err) => {
      if (!responseSent) {
        responseSent = true
        console.error('[netlify] handler error:', err)
        resolve({
          statusCode: 500,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }),
        })
      }
    })
  })
}
