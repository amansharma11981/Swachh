import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { registerSchema, loginSchema } from '../validators/authValidators.js'
import { validateBody } from '../middleware/validateRequest.js'

export function authRoutes({ controller, authenticate }) {
  const router = Router()
  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false, message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please wait and try again.' } } })
  router.post('/register', authLimiter, validateBody(registerSchema), controller.register)
  router.post('/login', authLimiter, validateBody(loginSchema), controller.login)
  router.get('/me', authenticate, controller.me)
  router.post('/logout', controller.logout)
  return router
}
