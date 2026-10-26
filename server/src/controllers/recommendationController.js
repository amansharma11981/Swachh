import mongoose from 'mongoose'
import { z } from 'zod'
import { AppError, badRequest, notFound } from '../utils/errors.js'
import { buildRecommendationEvidence } from '../services/recommendationService.js'
import { parseAdminFilters } from '../validators/moderationValidators.js'

const reviewSchema = z.object({
  status: z.enum(['reviewed', 'accepted', 'rejected', 'action_required', 'completed']),
  feedback: z.string().trim().max(1000).default(''),
  actionTaken: z.string().trim().max(500).default(''),
}).strict().superRefine((value, context) => {
  if (value.status === 'completed' && value.actionTaken.length < 3) context.addIssue({ code: 'custom', path: ['actionTaken'], message: 'Describe the action taken before marking complete.' })
})

const modelRecommendationSchema = z.object({
  title: z.string().trim().min(4).max(100),
  observation: z.string().trim().min(10).max(500),
  interpretation: z.string().trim().min(10).max(500),
  suggestedAction: z.string().trim().min(10).max(500),
  limitation: z.string().trim().min(5).max(300),
  priority: z.enum(['low', 'normal', 'high']),
  evidenceKeys: z.array(z.string().min(1).max(120)).min(1).max(6),
}).strict().refine((value) => !/\d/.test([value.title, value.observation, value.interpretation, value.suggestedAction, value.limitation].join(' ')), 'Model text cannot add numeric claims')

function parseModelRecommendations(content, evidence) {
  let parsed
  try { parsed = JSON.parse(content) } catch { throw new AppError(503, 'AI_INVALID_RESPONSE', 'The recommendation service returned an unreadable response. No recommendations were saved.') }
  const result = z.object({ recommendations: z.array(modelRecommendationSchema).max(4) }).strict().safeParse(parsed)
  if (!result.success) throw new AppError(503, 'AI_INVALID_RESPONSE', 'The recommendation service returned unsupported data. No recommendations were saved.')
  const evidenceByKey = new Map(evidence.evidence.map((item) => [item.key, item]))
  return result.data.recommendations.map((item) => {
    const keys = [...new Set(item.evidenceKeys)]
    const items = keys.map((key) => evidenceByKey.get(key))
    if (items.some((item) => !item)) throw new AppError(503, 'AI_UNSUPPORTED_EVIDENCE', 'The recommendation referenced evidence that was not supplied. No recommendations were saved.')
    const { evidenceKeys, ...safeFields } = item
    return { ...safeFields, evidence: items }
  })
}

export function recommendationController({ ReportModel, RecommendationModel, aiAnalysis, AuditModel }) {
  return {
    list: async (request, response) => {
      const page = Number.parseInt(request.query.page, 10) || 1
      const limit = Number.parseInt(request.query.limit, 10) || 10
      const statuses = ['new', 'reviewed', 'accepted', 'rejected', 'action_required', 'completed']
      if (!Number.isInteger(page) || page < 1 || page > 10000 || !Number.isInteger(limit) || limit < 1 || limit > 50) throw badRequest('Invalid page or limit')
      if (request.query.status && !statuses.includes(request.query.status)) throw badRequest('Unknown recommendation status')
      const filter = request.query.status ? { status: request.query.status } : {}
      const [items, total] = await Promise.all([RecommendationModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(), RecommendationModel.countDocuments(filter)])
      response.json({ success: true, data: { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } })
    },
    generate: async (request, response) => {
      const filters = parseAdminFilters({ ...request.validatedBody, limit: 1 })
      const evidence = await buildRecommendationEvidence({ ReportModel, filters })
      let recommendations = []
      if (evidence.total >= 3) {
        if (!aiAnalysis?.configured || !aiAnalysis.recommendations) throw new AppError(503, 'AI_NOT_CONFIGURED', 'AI recommendations are not configured. Existing report analytics remain available.')
        const result = await aiAnalysis.recommendations(evidence)
        if (result.status !== 'completed') throw new AppError(503, 'AI_UNAVAILABLE', 'AI recommendations are temporarily unavailable. No recommendation was saved.')
        recommendations = parseModelRecommendations(result.content, evidence)
      }
      const run = await RecommendationModel.create({
        generatedBy: request.user.id,
        model: evidence.total >= 3 ? aiAnalysis.model || 'configured Groq model' : 'not_called_insufficient_data',
        period: { start: evidence.period.start, end: evidence.period.end },
        filters: evidence.filters,
        evidence: { total: evidence.total, locatedTotal: evidence.locatedTotal, sufficientEvidence: evidence.sufficientEvidence },
        recommendations,
      })
      response.status(201).json({ success: true, data: { run } })
    },
    review: async (request, response) => {
      if (!mongoose.isValidObjectId(request.params.id)) throw notFound()
      const parsed = reviewSchema.safeParse(request.validatedBody)
      if (!parsed.success) throw badRequest('Check the recommendation review fields', parsed.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })))
      const run = await RecommendationModel.findById(request.params.id)
      if (!run) throw notFound()
      run.status = parsed.data.status
      run.feedback = parsed.data.feedback
      if (parsed.data.actionTaken) {
        const actionChanged = parsed.data.actionTaken !== run.actionTaken
        run.actionTaken = parsed.data.actionTaken
        if (actionChanged || !run.actionTakenAt) run.actionTakenAt = new Date()
      }
      run.reviewedBy = request.user.id
      run.reviewedAt = new Date()
      await run.save()
      await AuditModel?.create({ actor: request.user.id, action: 'recommendation_reviewed', targetType: 'RecommendationRun', targetId: run._id, changes: { status: run.status, feedbackLength: run.feedback.length, actionTakenRecorded: Boolean(run.actionTakenAt) } })
      response.json({ success: true, data: { run } })
    },
    outcome: async (request, response) => {
      if (!mongoose.isValidObjectId(request.params.id)) throw notFound()
      const run = await RecommendationModel.findById(request.params.id).lean()
      if (!run) throw notFound()
      if (!run.actionTakenAt) throw new AppError(409, 'ACTION_NOT_RECORDED', 'Record the date/action taken before comparing subsequent reports.')
      const duration = new Date(run.period.end) - new Date(run.period.start)
      if (duration <= 0 || duration > 366 * 24 * 60 * 60 * 1000) throw new AppError(409, 'INVALID_PERIOD', 'The stored reporting period cannot be compared.')
      const actionAt = new Date(run.actionTakenAt)
      const followEnd = new Date(Math.min(Date.now(), actionAt.getTime() + duration))
      if (followEnd <= actionAt) throw new AppError(409, 'FOLLOWUP_PENDING', 'There is not enough time after the recorded action to compare a follow-up period yet.')
      const filterFor = (start, end) => ({ createdAt: { $gte: start, $lt: end }, ...(run.filters?.zoneId ? { 'zone.zoneId': run.filters.zoneId } : {}), ...(run.filters?.category ? { category: run.filters.category } : {}), ...(run.filters?.priority ? { priority: run.filters.priority } : {}), ...(run.filters?.status ? { status: run.filters.status === 'in_progress' ? { $in: ['assigned', 'in_progress', 'submitted_for_verification', 'reopened'] } : run.filters.status } : {}) })
      const [baselineCount, followupCount] = await Promise.all([
        ReportModel.countDocuments(filterFor(new Date(actionAt.getTime() - duration), actionAt)),
        ReportModel.countDocuments(filterFor(actionAt, followEnd)),
      ])
      response.json({ success: true, data: { baseline: { from: new Date(actionAt.getTime() - duration), to: actionAt, reportCount: baselineCount }, followup: { from: actionAt, to: followEnd, reportCount: followupCount }, change: followupCount - baselineCount, periodComplete: followEnd.getTime() === actionAt.getTime() + duration, interpretation: 'Observed report-count change only. This comparison does not establish that the recorded action caused the change.' } })
    },
  }
}
