export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message)
    this.name = 'AppError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export const badRequest = (message = 'Request validation failed', details) => new AppError(400, 'VALIDATION_ERROR', message, details)
export const unauthorized = () => new AppError(401, 'UNAUTHORIZED', 'Authentication required')
export const forbidden = () => new AppError(403, 'FORBIDDEN', 'You do not have permission to perform this action')
export const notFound = () => new AppError(404, 'NOT_FOUND', 'The requested resource was not found')
