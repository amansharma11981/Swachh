import { Router } from 'express'
import { authorizeRole } from '../middleware/authenticate.js'
import { createReportUpload } from '../middleware/reportUpload.js'
import { validateBody } from '../middleware/validateRequest.js'
import { assignmentSchema, noteSchema, returnWorkSchema, verificationSchema } from '../validators/taskValidators.js'

export function taskRoutes({ controller, authenticate, config }) {
  const router = Router()
  const upload = createReportUpload({ maxFileSizeBytes: config.maxImageSizeBytes })
  router.get('/worker/dashboard', authenticate, authorizeRole('worker'), controller.workerDashboard)
  router.get('/worker/tasks', authenticate, authorizeRole('worker'), controller.workerTasks)
  router.get('/worker/tasks/:id', authenticate, authorizeRole('worker'), controller.workerTask)
  router.post('/worker/tasks/:id/accept', authenticate, authorizeRole('worker'), controller.accept)
  router.post('/worker/tasks/:id/notes', authenticate, authorizeRole('worker'), validateBody(noteSchema), controller.addNote)
  router.post('/worker/tasks/:id/evidence', authenticate, authorizeRole('worker'), ...upload, controller.addEvidence)
  router.post('/worker/tasks/:id/submit', authenticate, authorizeRole('worker'), controller.submit)

  router.get('/admin/queue', authenticate, authorizeRole('admin'), controller.adminQueue)
  router.get('/admin/workers', authenticate, authorizeRole('admin'), controller.adminWorkers)
  router.post('/admin/:id/assign', authenticate, authorizeRole('admin'), validateBody(assignmentSchema), controller.assign)
  router.get('/admin/:id/history', authenticate, authorizeRole('admin'), controller.assignmentHistory)
  router.post('/admin/:id/approve', authenticate, authorizeRole('admin'), validateBody(verificationSchema), (request, _response, next) => { request.taskApproval = true; next() }, controller.verify)
  router.post('/admin/:id/return', authenticate, authorizeRole('admin'), validateBody(returnWorkSchema), controller.verify)
  return router
}
