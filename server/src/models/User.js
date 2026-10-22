import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
  email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['citizen', 'worker', 'admin'], default: 'citizen', required: true },
  isActive: { type: Boolean, default: true, required: true },
  avatarUrl: { type: String, maxlength: 2048 },
  phone: { type: String, maxlength: 30 },
  lastLoginAt: { type: Date },
}, { timestamps: true, strict: 'throw', toJSON: { transform: (_doc, ret) => { delete ret.passwordHash; delete ret.__v; return ret } } })

userSchema.index({ email: 1 }, { unique: true })
userSchema.statics.findByEmail = function findByEmail(email, withPassword = false) {
  const query = this.findOne({ email })
  return withPassword ? query.select('+passwordHash') : query
}
userSchema.statics.findSafeById = function findSafeById(id) { return this.findById(id) }
userSchema.methods.verifyPassword = function verifyPassword(password) { return bcrypt.compare(password, this.passwordHash) }

export function toSafeUser(user) {
  if (!user) return null
  const value = typeof user.toObject === 'function' ? user.toObject() : { ...user }
  const { _id, id, passwordHash, __v, ...safe } = value
  return { id: String(id || _id), ...safe }
}

export const User = mongoose.models.User || mongoose.model('User', userSchema)
