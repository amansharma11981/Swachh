import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { authorizeRole } from '../middleware/authenticate.js'
import { createReportUpload } from '../middleware/reportUpload.js'
import { validateBody } from '../middleware/validateRequest.js'
import { reportUpdateSchema, validateReportBody } from '../validators/reportValidators.js'

export function reportRoutes({ controller, authenticate, config }) {
  const router = Router()
  const createLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false, message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many report submissions. Please wait before trying again.' } } })
  const upload = createReportUpload({ maxFileSizeBytes: config.maxImageSizeBytes })
  router.get('/meta/zones', authenticate, authorizeRole('citizen'), controller.listZones)
  router.get('/dashboard', authenticate, authorizeRole('citizen'), controller.dashboardStats)
  router.get('/my', authenticate, authorizeRole('citizen'), controller.listMine)
  router.get('/', authenticate, authorizeRole('admin'), controller.listAll)
  router.post('/', authenticate, authorizeRole('citizen'), createLimiter, ...upload, validateReportBody, controller.create)
  router.get('/:id', authenticate, authorizeRole('citizen', 'admin'), controller.getById)
  router.patch('/:id', authenticate, authorizeRole('citizen'), validateBody(reportUpdateSchema), controller.update)
  return router
}
