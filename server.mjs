import express from 'express'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const directory = fileURLToPath(new URL('./dist/', import.meta.url))
const index = path.join(directory, 'index.html')
if (!existsSync(index)) {
  throw new Error('Frontend build missing. Run npm run build before starting.')
}

const app = express()
let apiOrigin
try {
  const deployment = JSON.parse(readFileSync(path.join(directory, 'deployment.json'), 'utf8'))
  const url = new URL(deployment.apiOrigin)
  if (url.protocol !== 'https:' || url.origin !== deployment.apiOrigin) throw Error()
  apiOrigin = url.origin
} catch { throw Error('Frontend deployment metadata missing or invalid; rebuild with approved public API configuration.') }
app.disable('x-powered-by')
app.use((_request,response,next)=>{
  response.set('Content-Security-Policy',`default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self' ${apiOrigin}; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'`)
  response.set('Referrer-Policy','no-referrer')
  response.set('X-Content-Type-Options','nosniff')
  next()
})
app.use(express.static(directory, { index: 'index.html' }))
// Support browser navigation while keeping missing assets and API URLs as 404s.
app.get('/{*path}', (request, response) => {
  if (request.path === '/api' || request.path.startsWith('/api/') || path.extname(request.path) || !request.accepts('html')) {
    response.sendStatus(404)
    return
  }
  response.set('Cache-Control', 'no-cache').sendFile(index)
})
const port = Number(process.env.PORT || 3000)
if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error('Invalid frontend PORT configuration')
const server = app.listen(port, process.env.HOST || '0.0.0.0', () => {
  console.info(`Frontend listening on port ${port}`)
})
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0))
    setTimeout(() => process.exit(1), 10_000).unref()
  })
}
