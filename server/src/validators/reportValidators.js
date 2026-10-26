import { z } from 'zod'
import { REPORT_CATEGORIES, REPORT_STATUSES } from '../models/Report.js'
import { badRequest } from '../utils/errors.js'

const optionalCoordinate = z.preprocess((value) => value === '' || value === undefined ? undefined : Number(value), z.number().finite().optional())

export const reportMultipartSchema = z.object({
  description: z.string().trim().min(10, 'Describe the issue in at least 10 characters').max(2000, 'Description must be 2000 characters or fewer'),
  category: z.enum(REPORT_CATEGORIES),
  locationLabel: z.string().trim().min(3, 'Enter a location description').max(200),
  latitude: optionalCoordinate.refine((value) => value === undefined || (value >= -90 && value <= 90), 'Latitude must be between -90 and 90'),
  longitude: optionalCoordinate.refine((value) => value === undefined || (value >= -180 && value <= 180), 'Longitude must be between -180 and 180'),
  source: z.enum(['manual', 'gps']).default('manual'),
  zoneId: z.string().trim().max(80).optional().transform((value) => value || undefined),
  analysisToken: z.string().max(5000).optional(),
}).strict().superRefine((data, context) => {
  if ((data.latitude === undefined) !== (data.longitude === undefined)) {
    context.addIssue({ code: 'custom', path: ['latitude'], message: 'Provide both latitude and longitude, or leave both blank.' })
  }
  if (data.source === 'gps' && (data.latitude === undefined || data.longitude === undefined)) {
    context.addIssue({ code: 'custom', path: ['latitude'], message: 'GPS coordinates are required when using current location.' })
  }
})

export const reportAnalysisSchema = z.object({
  description: z.string().trim().max(2000).optional().default(''),
}).strict()

export const reportUpdateSchema = z.object({
  description: z.string().trim().min(10).max(2000).optional(),
  category: z.enum(REPORT_CATEGORIES).optional(),
  zoneId: z.string().trim().max(80).optional().transform((value) => value || undefined),
}).strict().refine((data) => Object.values(data).some((value) => value !== undefined), { message: 'Provide a description, category, or zone to update' })

export function validateReportBody(request, _response, next) {
  const result = reportMultipartSchema.safeParse(request.body)
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message }))
    return next(badRequest('Check the report fields and try again', details))
  }
  request.validatedBody = result.data
  next()
}

export function parseReportQuery(query) {
  const page = Number(query.page || 1)
  const limit = Number(query.limit || 10)
  const status = query.status || undefined
  if (!Number.isInteger(page) || page < 1 || page > 100_000) throw badRequest('Page must be a positive integer')
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw badRequest('Limit must be between 1 and 50')
  if (status && !REPORT_STATUSES.includes(status)) throw badRequest('Unknown report status')
  return { page, limit, status }
}
