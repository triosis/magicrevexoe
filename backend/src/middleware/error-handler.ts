import type { ErrorRequestHandler } from 'express'

export class HttpError extends Error {
  constructor(public readonly status: number, message: string) { super(message) }
}

export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, next) => {
  if (response.headersSent) { next(error); return }
  if (error instanceof HttpError) {
    if ('code' in error && 'metric' in error && 'limit' in error && 'used' in error && 'remaining' in error && 'limitMode' in error) {
      const anonymous=_request.path.startsWith('/api/v1/public/')
      response.status(error.status).json({error:error.message,code:error.code,metric:error.metric,limit:anonymous?null:error.limit,used:anonymous?null:error.used,remaining:anonymous?null:error.remaining,limitMode:anonymous?'unavailable':error.limitMode});return
    }
    response.status(error.status).json({ error: error.message })
    return
  }
  // Parser errors get fixed public messages, never the raw body or error details.
  const status = typeof error === 'object' && error !== null && 'status' in error ? error.status : undefined
  if (status === 400 || status === 413 || status === 415) {
    response.status(status).json({ error: status === 413 ? 'Request body too large' : 'Invalid request body' })
    return
  }
  console.error('Unhandled request error; details withheld to protect sensitive data.')
  response.status(500).json({ error: 'Internal server error' })
}
