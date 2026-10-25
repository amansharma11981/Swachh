import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { User } from './models/User.js'
import { Report, ReportCounter } from './models/Report.js'
import { Zone } from './models/Zone.js'
import { databaseStatus } from './config/db.js'
import { originGuard } from './middleware/originGuard.js'
import { authenticate as createAuthenticate } from './middleware/authenticate.js'
import { errorHandler } from './middleware/errorHandler.js'
import { notFoundHandler } from './middleware/notFound.js'
import { authController } from './controllers/authController.js'
import { userController } from './controllers/userController.js'
import { createAuthService } from './services/authService.js'
import { authRoutes } from './routes/authRoutes.js'
import { healthRoutes } from './routes/healthRoutes.js'
import { userRoutes } from './routes/userRoutes.js'
import { reportRoutes } from './routes/reportRoutes.js'
import { taskRoutes } from './routes/taskRoutes.js'
import { reportController } from './controllers/reportController.js'
import { taskController } from './controllers/taskController.js'
import { createImageStorage } from './services/imageStorage.js'
import { AppError } from './utils/errors.js'
import { logger } from './utils/logger.js'

export function createApp({ config, UserModel = User, ReportModel = Report, CounterModel = ReportCounter, ZoneModel = Zone, imageStorage = createImageStorage(config), getDatabaseStatus = databaseStatus, authService = createAuthService({ UserModel, config }) }) {
  const app = express()
  app.disable('x-powered-by')
  app.use(helmet())
  app.use(cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || config.clientOrigins.includes(origin)) return callback(null, true)
      return callback(new AppError(403, 'ORIGIN_NOT_ALLOWED', 'Request origin is not allowed'))
    },
    methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-Requested-With'],
  }))
  app.use(express.json({ limit: '32kb', strict: true }))
  app.use(cookieParser())
  app.use(originGuard(config))
  app.use((request, response, next) => {
    const started = Date.now()
    response.on('finish', () => logger.info('http_request', { method: request.method, path: request.path, status: response.statusCode, durationMs: Date.now() - started }))
    next()
  })

  const authenticate = createAuthenticate({ UserModel, config })
  const authHandlers = authController({ authService, config })
  const userHandlers = userController({ UserModel })
  const reportHandlers = reportController({ ReportModel, CounterModel, ZoneModel, imageStorage })
  const taskHandlers = taskController({ ReportModel, UserModel, imageStorage })
  const api = express.Router()
  api.use('/health', healthRoutes(getDatabaseStatus))
  api.use('/auth', authRoutes({ controller: authHandlers, authenticate }))
  api.use('/users', userRoutes({ controller: userHandlers, authenticate }))
  api.use('/reports', reportRoutes({ controller: reportHandlers, authenticate, config }))
  api.use('/tasks', taskRoutes({ controller: taskHandlers, authenticate, config }))
  app.use('/api/v1', api)
  app.use(notFoundHandler)
  app.use(errorHandler)
  return app
}
