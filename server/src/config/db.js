import mongoose from 'mongoose'
import { logger } from '../utils/logger.js'

let connectionPromise

export async function connectDb(uri) {
  if (mongoose.connection.readyState === 1) return mongoose.connection
  if (connectionPromise) return connectionPromise
  connectionPromise = mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 }).then(() => {
    logger.info('database_connected')
    return mongoose.connection
  }).catch((error) => {
    connectionPromise = undefined
    throw error
  })
  return connectionPromise
}

mongoose.connection.on('disconnected', () => logger.warn('database_disconnected'))
mongoose.connection.on('error', () => logger.error('database_connection_error'))

export async function disconnectDb() {
  connectionPromise = undefined
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect()
}

export function databaseStatus() {
  return mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
}
