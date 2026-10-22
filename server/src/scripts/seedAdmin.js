import bcrypt from 'bcryptjs'
import { loadConfig } from '../config/env.js'
import { connectDb, disconnectDb } from '../config/db.js'
import { User } from '../models/User.js'
import { logger } from '../utils/logger.js'

async function seedAdmin() {
  const config = loadConfig()
  const name = process.env.INITIAL_ADMIN_NAME?.trim()
  const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.INITIAL_ADMIN_PASSWORD
  if (!name || !email || !password || password.length < 12 || password.length > 128) {
    throw new Error('Set INITIAL_ADMIN_NAME, INITIAL_ADMIN_EMAIL, and a 12–128 character INITIAL_ADMIN_PASSWORD in server/.env.')
  }
  await connectDb(config.mongoUri)
  try {
    if (await User.findByEmail(email)) throw new Error('An account with the configured initial-admin email already exists; no account was changed.')
    const passwordHash = await bcrypt.hash(password, 12)
    await User.create({ name, email, passwordHash, role: 'admin' })
    logger.info('initial_admin_created', { email })
  } finally {
    await disconnectDb()
  }
}

seedAdmin().catch((error) => {
  logger.error('initial_admin_seed_failed', { message: error.message })
  process.exitCode = 1
})
