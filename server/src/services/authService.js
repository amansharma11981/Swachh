import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { AppError } from '../utils/errors.js'
import { toSafeUser } from '../models/User.js'

const dummyPasswordHash = bcrypt.hashSync('swachhai-invalid-account-timing-padding', 12)

export function createAuthService({ UserModel, config, passwordHasher = bcrypt, token = jwt }) {
  function createToken(user) {
    return token.sign({}, config.jwtSecret, { subject: String(user._id || user.id), expiresIn: config.jwtExpiresIn, issuer: 'swachhai-api', audience: 'swachhai-web' })
  }

  async function register(input) {
    const passwordHash = await passwordHasher.hash(input.password, 12)
    try {
      const user = await UserModel.create({ name: input.name, email: input.email, passwordHash, role: 'citizen' })
      return { user: toSafeUser(user), sessionToken: createToken(user) }
    } catch (error) {
      if (error?.code === 11000) throw new AppError(409, 'EMAIL_IN_USE', 'An account with this email already exists')
      throw error
    }
  }

  async function login({ email, password }) {
    const user = await UserModel.findByEmail(email, true)
    const validPassword = user ? await user.verifyPassword(password) : await passwordHasher.compare(password, dummyPasswordHash)
    if (!user || !validPassword || !user.isActive) throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect')
    user.lastLoginAt = new Date()
    await user.save()
    return { user: toSafeUser(user), sessionToken: createToken(user) }
  }

  return { register, login, createToken }
}
