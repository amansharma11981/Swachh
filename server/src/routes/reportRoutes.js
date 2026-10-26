import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { authorizeRole } from '../middleware/authenticate.js'
import { createReportUpload } from '../middleware/reportUpload.js'
import { validateBody } from '../middleware/validateRequest.js'
import { reportAnalysisSchema, reportUpdateSchema, validateReportBody } from '../validators/reportValidators.js'
import { duplicateSchema, moderationSchema } from '../validators/moderationValidators.js'

export function reportRoutes({ controller, authenticate, config }) {
  const router = Router()
  const createLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false, message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many report submissions. Please wait before trying again.' } } })
  const analysisLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false, message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many image analysis requests. You can still submit reports using manual category selection.' } } })
  const upload = createReportUpload({ maxFileSizeBytes: config.maxImageSizeBytes })
  router.get('/meta/zones', authenticate, authorizeRole('citizen', 'worker', 'admin'), controller.listZones)
  router.get('/map', authenticate, authorizeRole('citizen', 'worker', 'admin'), controller.mapReports)
  router.get('/admin/metrics', authenticate, authorizeRole('admin'), controller.adminMetrics)
  router.get('/admin/audit', authenticate, authorizeRole('admin'), controller.recentAudit)
  router.get('/admin/hotspots', authenticate, authorizeRole('admin'), controller.hotspots)
  router.get('/admin/:id/audit', authenticate, authorizeRole('admin'), controller.auditHistory)
  router.get('/admin/:id/duplicate-candidates', authenticate, authorizeRole('admin'), controller.duplicateCandidates)
  router.patch('/admin/:id/moderate', authenticate, authorizeRole('admin'), validateBody(moderationSchema), controller.moderate)
  router.post('/admin/:id/duplicates', authenticate, authorizeRole('admin'), validateBody(duplicateSchema), controller.linkDuplicate)
  router.get('/dashboard', authenticate, authorizeRole('citizen'), controller.dashboardStats)
  router.get('/my', authenticate, authorizeRole('citizen'), controller.listMine)
  router.post('/analyze', authenticate, authorizeRole('citizen'), analysisLimiter, ...upload, validateBody(reportAnalysisSchema), controller.analyze)
  router.get('/', authenticate, authorizeRole('admin'), controller.listAll)
  router.post('/', authenticate, authorizeRole('citizen'), createLimiter, ...upload, validateReportBody, controller.create)
  router.get('/:id', authenticate, authorizeRole('citizen', 'admin'), controller.getById)
  router.patch('/:id', authenticate, authorizeRole('citizen'), validateBody(reportUpdateSchema), controller.update)
  return router
}
