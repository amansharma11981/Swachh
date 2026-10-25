import mongoose from 'mongoose'
import { z } from 'zod'
import { badRequest } from '../utils/errors.js'

export const assignmentSchema = z.object({
  workerId: z.string().refine(mongoose.isValidObjectId, 'Choose a valid worker'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  dueAt: z.string().datetime().optional().nullable(),
  reason: z.string().trim().max(500).default(''),
}).strict()

export const noteSchema = z.object({ body: z.string().trim().min(1).max(500) }).strict()
export const verificationSchema = z.object({ reason: z.string().trim().max(500).default('') }).strict()
export const returnWorkSchema = z.object({ reason: z.string().trim().min(8, 'Provide a reason of at least eight characters').max(500) }).strict()

export function parseTaskQuery(query) {
  const page = Number(query.page || 1)
  const limit = Number(query.limit || 10)
  const status = query.status || undefined
  const q = typeof query.q === 'string' ? query.q.trim() : ''
  const allowed = ['active', 'assigned', 'in_progress', 'submitted_for_verification', 'completed', 'resolved', 'needs_work']
  if (!Number.isInteger(page) || page < 1 || page > 100_000) throw badRequest('Page must be a positive integer')
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw badRequest('Limit must be between 1 and 50')
  if (status && !allowed.includes(status)) throw badRequest('Unknown task status')
  if (q.length > 80 || (query.q !== undefined && typeof query.q !== 'string') || !/^[A-Za-z0-9-]*$/.test(q)) throw badRequest('Search must contain only letters, numbers, or hyphens and be 80 characters or fewer')
  return { page, limit, status, q }
}
