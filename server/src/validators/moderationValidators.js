import { z } from 'zod'
import { REPORT_CATEGORIES, REPORT_STATUSES } from '../models/Report.js'
import { badRequest } from '../utils/errors.js'

export const moderationSchema = z.object({
  category: z.enum(REPORT_CATEGORIES).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  status: z.enum(REPORT_STATUSES).optional(),
  note: z.string().trim().max(1000).default(''),
  aiDecision: z.enum(['accepted', 'corrected', 'inconclusive']).optional(),
}).strict().refine((value) => Boolean(value.note) || Object.keys(value).some((key) => !['note'].includes(key)), { message: 'Provide a review note or a moderation change' })

export const duplicateSchema = z.object({ relatedReportId: z.string().regex(/^[a-f\d]{24}$/i), markDuplicate: z.boolean().default(false), note: z.string().trim().max(500).default('') }).strict()

export function parseAdminFilters(query) {
  const page = Number(query.page || 1), limit = Number(query.limit || 10)
  const validDate = (value) => !value || (typeof value === 'string' && value.length <= 40 && !Number.isNaN(Date.parse(value)))
  if (!Number.isInteger(page) || page < 1 || page > 100000 || !Number.isInteger(limit) || limit < 1 || limit > 300) throw badRequest('Invalid page or limit')
  if (query.status && !REPORT_STATUSES.includes(query.status)) throw badRequest('Unknown report status')
  if (query.category && !REPORT_CATEGORIES.includes(query.category)) throw badRequest('Unknown report category')
  if (query.priority && !['low', 'normal', 'high', 'urgent'].includes(query.priority)) throw badRequest('Unknown report priority')
  if (!validDate(query.from) || !validDate(query.to)) throw badRequest('Invalid date filter')
  if (query.q !== undefined && typeof query.q !== 'string') throw badRequest('Search must be text')
  const q = (query.q || '').trim()
  if (q.length > 80) throw badRequest('Search must be 80 characters or fewer')
  if (query.from && query.to && new Date(query.from) > new Date(query.to)) throw badRequest('Start date must be before end date')
  return { page, limit, status: query.status, category: query.category, priority: query.priority, from: query.from, to: query.to, zoneId: typeof query.zoneId === 'string' ? query.zoneId.slice(0, 80) : '', q }
}
