import express from 'express'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const directory = fileURLToPath(new URL('./dist/', import.meta.url))
const index = path.join(directory, 'index.html')
if (!existsSync(index)) {
  throw new Error('Frontend build missing. Run npm run build before starting.')
}

const app = express()
app.disable('x-powered-by')
app.use((_request,response,next)=>{
  response.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self' https: http://127.0.0.1:* http://localhost:*; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'")
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
const server = app.listen(port, process.env.HOST || '0.0.0.0', () => {
  console.info(`Frontend listening on port ${port}`)
})
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0))
    setTimeout(() => process.exit(1), 10_000).unref()
  })
}
