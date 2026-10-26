import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { validateBody } from '../middleware/validateRequest.js'

const schema = z.object({ messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().trim().min(1).max(1000) }).strict()).min(1).max(8).refine((messages) => messages.at(-1)?.role === 'user', 'The last message must be from the user.') }).strict()

export function assistantRoutes({ controller, authenticate }) {
  const router = Router()
  const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false, message: { success: false, error: { code: 'RATE_LIMITED', message: 'Please wait before sending more assistant messages.' } } })
  router.post('/chat', authenticate, limiter, validateBody(schema), controller.chat)
  return router
}
