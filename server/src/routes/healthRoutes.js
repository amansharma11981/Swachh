import { Router } from 'express'

export function healthRoutes(getDatabaseStatus) {
  const router = Router()
  router.get('/', (_request, response) => {
    const database = getDatabaseStatus()
    const status = database === 'connected' ? 'ok' : 'degraded'
    response.status(database === 'connected' ? 200 : 503).json({ success: true, data: { status, database, timestamp: new Date().toISOString() } })
  })
  return router
}
