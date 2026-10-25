import { ZodError } from 'zod'
import { logger } from '../utils/logger.js'

export function errorHandler(error, request, response, _next) {
  if (response.headersSent) return
  let status = error.status || 500
  let code = error.code || 'INTERNAL_ERROR'
  let message = status < 500 || error.name === 'AppError' ? (error.message || 'Request failed') : 'An unexpected error occurred'
  let details = error.details
  if (error instanceof ZodError) {
    status = 400; code = 'VALIDATION_ERROR'; message = 'Check the submitted fields and try again'
    details = error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message }))
  } else if (error?.code === 11000) {
    status = 409; code = 'CONFLICT'; message = 'A record with this information already exists'; details = undefined
  } else if (error?.name === 'VersionError') {
    status = 409; code = 'CONCURRENT_UPDATE'; message = 'This report changed while you were updating it. Reload it and try again.'; details = undefined
  } else if (error?.type === 'entity.too.large') {
    status = 413; code = 'PAYLOAD_TOO_LARGE'; message = 'Request body is too large'; details = undefined
  } else if (error?.type === 'entity.parse.failed') {
    status = 400; code = 'INVALID_JSON'; message = 'Request body must contain valid JSON'; details = undefined
  } else if (error?.status === 429) {
    status = 429; code = 'RATE_LIMITED'; message = 'Too many attempts. Please wait and try again.'; details = undefined
  }
  if (status >= 500) logger.error('request_failed', { method: request.method, path: request.path, status, errorName: error.name || 'Error' })
  response.status(status).json({ success: false, error: { code, message, ...(details ? { details } : {}) } })
}
