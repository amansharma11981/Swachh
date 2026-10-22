import jwt from 'jsonwebtoken'
import { unauthorized } from '../utils/errors.js'
import { toSafeUser } from '../models/User.js'

export function authenticate({ UserModel, config, token = jwt }) {
  return async (request, _response, next) => {
    const sessionToken = request.cookies?.[config.cookieName]
    if (!sessionToken) return next(unauthorized())
    let claims
    try {
      claims = token.verify(sessionToken, config.jwtSecret, { issuer: 'swachhai-api', audience: 'swachhai-web', algorithms: ['HS256'] })
    } catch {
      return next(unauthorized())
    }
    if (!claims || typeof claims.sub !== 'string' || typeof claims.exp !== 'number') return next(unauthorized())
    try {
      const user = await UserModel.findSafeById(claims.sub)
      if (!user || !user.isActive) return next(unauthorized())
      request.user = toSafeUser(user)
      next()
    } catch (error) { next(error) }
  }
}

export function authorizeRole(...roles) {
  return (request, _response, next) => {
    if (!request.user) return next(unauthorized())
    if (!roles.includes(request.user.role)) return next({ status: 403, code: 'FORBIDDEN', message: 'You do not have permission to perform this action' })
    next()
  }
}
