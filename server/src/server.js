import http from 'node:http'
import { loadConfig } from './config/env.js'
import { connectDb, disconnectDb } from './config/db.js'
import { User } from './models/User.js'
import { Report, ReportCounter } from './models/Report.js'
import { Zone, seedConfiguredZones } from './models/Zone.js'
import { createApp } from './app.js'
import { logger } from './utils/logger.js'

async function start() {
  const config = loadConfig()
  await connectDb(config.mongoUri)
  await User.init()
  await Promise.all([Report.init(), ReportCounter.init(), Zone.init()])
  await seedConfiguredZones(Zone, config.reportZones)
  const server = http.createServer(createApp({ config }))
  server.listen(config.port, () => logger.info('server_listening', { port: config.port, environment: config.nodeEnv }))

  let shuttingDown = false
  const shutdown = (signal) => {
    if (shuttingDown) return
    shuttingDown = true
    logger.info('server_shutdown', { signal })
    server.close(async (error) => {
      try { await disconnectDb() } catch { logger.error('database_shutdown_error') }
      if (error) { logger.error('http_shutdown_error'); process.exitCode = 1 }
    })
  }
  process.once('SIGINT', () => shutdown('SIGINT'))
  process.once('SIGTERM', () => shutdown('SIGTERM'))
}

start().catch((error) => {
  logger.error('server_start_failed', { errorName: error.name || 'Error' })
  console.error('API startup failed. Check server/.env, ensure required values are set, and confirm MongoDB is available.')
  process.exitCode = 1
})
