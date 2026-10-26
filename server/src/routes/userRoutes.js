import { Router } from 'express'
import { approvalSchema, profileSchema, roleSchema } from '../validators/authValidators.js'
import { validateBody } from '../middleware/validateRequest.js'
import { authorizeRole } from '../middleware/authenticate.js'

export function userRoutes({ controller, authenticate }) {
  const router = Router()
  router.get('/me', authenticate, controller.getMe)
  router.patch('/me', authenticate, validateBody(profileSchema), controller.updateMe)
  router.get('/approval-requests', authenticate, authorizeRole('admin'), controller.listApprovalRequests)
  router.patch('/:id/approval', authenticate, authorizeRole('admin'), validateBody(approvalSchema), controller.decideApprovalRequest)
  router.get('/', authenticate, authorizeRole('admin'), controller.listUsers)
  router.patch('/:id/role', authenticate, authorizeRole('admin'), validateBody(roleSchema), controller.updateRole)
  return router
}
