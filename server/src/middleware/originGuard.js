import { AppError } from '../utils/errors.js'

const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS'])

export function originGuard(config) {
  return (request, _response, next) => {
    if (safeMethods.has(request.method)) return next()
    const origin = request.get('origin')
    if (!origin || !config.clientOrigins.includes(origin)) return next(new AppError(403, 'ORIGIN_NOT_ALLOWED', 'Request origin is not allowed'))
    next()
  }
}
