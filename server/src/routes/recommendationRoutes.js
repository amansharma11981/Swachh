import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { authorizeRole } from '../middleware/authenticate.js'
import { validateBody } from '../middleware/validateRequest.js'

const filtersSchema = z.object({
  from: z.string().max(40).optional(), to: z.string().max(40).optional(),
  category: z.string().max(80).optional(), priority: z.string().max(20).optional(), status: z.string().max(50).optional(), zoneId: z.string().max(80).optional(),
}).strict()

export function recommendationRoutes({ controller, authenticate }) {
  const router = Router()
  const generateLimit = rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false, message: { success: false, error: { code: 'RATE_LIMITED', message: 'Recommendation generation is limited to five runs per hour.' } } })
  router.get('/', authenticate, authorizeRole('admin'), controller.list)
  router.post('/generate', authenticate, authorizeRole('admin'), generateLimit, validateBody(filtersSchema), controller.generate)
  router.patch('/:id/review', authenticate, authorizeRole('admin'), validateBody(z.object({ status: z.enum(['reviewed', 'accepted', 'rejected', 'action_required', 'completed']), feedback: z.string().trim().max(1000).default(''), actionTaken: z.string().trim().max(500).default('') }).strict()), controller.review)
  router.get('/:id/outcome', authenticate, authorizeRole('admin'), controller.outcome)
  return router
}
