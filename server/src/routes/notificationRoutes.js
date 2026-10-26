import { Router } from 'express'

export function notificationRoutes({ controller, authenticate }) {
  const router = Router()
  router.get('/', authenticate, controller.list)
  router.patch('/read-all', authenticate, controller.markAllRead)
  router.patch('/:id/read', authenticate, controller.markRead)
  return router
}
