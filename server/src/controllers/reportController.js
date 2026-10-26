import mongoose from 'mongoose'
import { AppError, badRequest, notFound } from '../utils/errors.js'
import { nextReportNumber, serializeReport } from '../services/reportService.js'
import { parseReportQuery } from '../validators/reportValidators.js'
import { parseAdminFilters } from '../validators/moderationValidators.js'
import { transitionReportStatus } from '../services/reportService.js'
import { signAnalysisToken, verifyAnalysisToken } from '../services/aiAnalysis.js'

const initialStatuses = ['submitted', 'under_review']

async function pagedQuery(Model, filter, page, limit, admin = false) {
  const [items, total] = await Promise.all([
    Model.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Model.countDocuments(filter),
  ])
  return { items: items.map((item) => serializeReport(item, { admin })), pagination: { page, limit, total, pages: Math.ceil(total / limit) } }
}

function statusFilter(status) {
  return status === 'in_progress' ? { $in: ['assigned', 'in_progress', 'submitted_for_verification', 'reopened'] } : status
}

function escapeRegex(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }
function textSimilarity(left = '', right = '') {
  const words = (value) => new Set(value.toLowerCase().match(/[a-z0-9]{3,}/g) || [])
  const a = words(left), b = words(right)
  if (!a.size || !b.size) return 0
  let common = 0; for (const word of a) if (b.has(word)) common += 1
  return common / (a.size + b.size - common)
}
function distanceMeters(a, b) {
  if (!a || !b) return null
  const [lon1, lat1] = a.coordinates || [], [lon2, lat2] = b.coordinates || []
  if (![lon1, lat1, lon2, lat2].every(Number.isFinite)) return null
  const rad = (n) => n * Math.PI / 180
  const dLat = rad(lat2 - lat1), dLon = rad(lon2 - lon1)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}
function createdAtRange(from, to) {
  const range = {}
  if (from) range.$gte = new Date(from)
  if (to) {
    const end = new Date(to)
    if (/^\d{4}-\d{2}-\d{2}$/.test(to)) { end.setUTCDate(end.getUTCDate() + 1); range.$lt = end }
    else range.$lte = end
  }
  return range
}

export function reportController({ ReportModel, CounterModel, ZoneModel, imageStorage, AuditModel, aiAnalysis, config }) {
  return {
    create: async (request, response) => {
      if (!imageStorage.enabled) throw new AppError(503, 'IMAGE_STORAGE_NOT_CONFIGURED', 'Image storage is not configured. Contact the project administrator.')
      const values = request.validatedBody
      let zone
      if (values.zoneId) {
        zone = await ZoneModel.findOne({ zoneId: values.zoneId, isActive: true }).lean()
        if (!zone) throw badRequest('Choose an available pilot zone or leave the zone unselected', [{ field: 'zoneId', message: 'This pilot zone is not available.' }])
      }

      const reportNumber = await nextReportNumber(CounterModel)
      const storedAnalysis = values.analysisToken ? verifyAnalysisToken(values.analysisToken, {
        userId: request.user.id, buffer: request.file.buffer, contentType: request.detectedImageType,
        description: values.description, secret: config.jwtSecret,
      }) : null
      const uploadedImage = await imageStorage.upload(request.file.buffer, { contentType: request.detectedImageType })
      try {
        const report = await ReportModel.create({
          reportNumber,
          reporter: request.user.id,
          description: values.description,
          category: values.category,
          location: {
            label: values.locationLabel,
            source: values.source,
            ...(values.latitude === undefined ? {} : { point: { type: 'Point', coordinates: [values.longitude, values.latitude] }, capturedAt: values.source === 'gps' ? new Date() : undefined }),
          },
          ...(zone ? { zone: { zoneId: zone.zoneId, name: zone.name, boundaryVerified: zone.boundaryVerified } } : {}),
          ...(storedAnalysis ? { aiAnalysis: storedAnalysis } : {}),
          images: [uploadedImage], status: 'submitted', priority: 'normal',
          statusHistory: [{ fromStatus: null, toStatus: 'submitted', actor: request.user.id, timestamp: new Date(), note: 'Report submitted by citizen' }],
        })
        response.status(201).json({ success: true, data: { report: serializeReport(report) } })
      } catch (error) {
        try { await imageStorage.remove(uploadedImage.assetId) } catch { /* Provider cleanup is best effort; do not hide the database failure. */ }
        throw error
      }
    },

    analyze: async (request, response) => {
      if (!aiAnalysis?.configured) throw new AppError(503, 'AI_NOT_CONFIGURED', 'Image analysis is not configured. You can still submit this report using your selected category.')
      const analysis = await aiAnalysis.analyze({ buffer: request.file.buffer, contentType: request.detectedImageType, description: request.validatedBody.description })
      if (!['completed', 'inconclusive'].includes(analysis.status)) throw new AppError(503, 'AI_UNAVAILABLE', 'Image analysis is temporarily unavailable. You can still submit this report using your selected category.')
      const analysisToken = signAnalysisToken({ analysis, userId: request.user.id, buffer: request.file.buffer, contentType: request.detectedImageType, description: request.validatedBody.description, secret: config.jwtSecret })
      response.json({ success: true, data: { analysis, analysisToken } })
    },

    listMine: async (request, response) => {
      const { page, limit, status } = parseReportQuery(request.query)
      const filter = { reporter: request.user.id, ...(status ? { status: statusFilter(status) } : {}) }
      const result = await pagedQuery(ReportModel, filter, page, limit)
      response.json({ success: true, data: result })
    },

    listAll: async (request, response) => {
      const filters = parseAdminFilters(request.query)
      const filter = {
        ...(filters.status ? { status: statusFilter(filters.status) } : {}),
        ...(filters.category ? { category: filters.category } : {}),
        ...(filters.priority ? { priority: filters.priority } : {}),
        ...(filters.zoneId ? { 'zone.zoneId': filters.zoneId } : {}),
        ...(filters.q ? { $or: [{ reportNumber: new RegExp(escapeRegex(filters.q), 'i') }, { description: new RegExp(escapeRegex(filters.q), 'i') }] } : {}),
      }
      if (filters.from || filters.to) filter.createdAt = createdAtRange(filters.from, filters.to)
      response.json({ success: true, data: await pagedQuery(ReportModel, filter, filters.page, filters.limit, true) })
    },

    mapReports: async (request, response) => {
      const filters = parseAdminFilters({ ...request.query, page: 1, limit: Math.min(Number(request.query.limit || 200), 300) })
      const filter = { 'location.point': { $exists: true }, ...(filters.status ? { status: filters.status } : {}), ...(filters.category ? { category: filters.category } : {}), ...(filters.priority ? { priority: filters.priority } : {}), ...(filters.zoneId ? { 'zone.zoneId': filters.zoneId } : {}) }
      if (filters.from || filters.to) filter.createdAt = createdAtRange(filters.from, filters.to)
      if (request.user.role === 'citizen') filter.reporter = request.user.id
      if (request.user.role === 'worker') filter.assignedWorker = request.user.id
      const [rows, total] = await Promise.all([
        ReportModel.find(filter).select('reportNumber category status priority createdAt location zone').sort({ createdAt: -1 }).limit(filters.limit).lean(),
        ReportModel.countDocuments(filter),
      ])
      response.json({ success: true, data: { items: rows.map((report) => ({ id: String(report._id), reportNumber: report.reportNumber, category: report.category, status: report.status, priority: report.priority, createdAt: report.createdAt, location: report.location, zone: report.zone?.name || null })), total, limit: filters.limit, truncated: total > filters.limit } })
    },

    adminMetrics: async (request, response) => {
      const filters = parseAdminFilters({ ...request.query, limit: 1 })
      const filter = { ...(filters.zoneId ? { 'zone.zoneId': filters.zoneId } : {}), ...(filters.status ? { status: statusFilter(filters.status) } : {}), ...(filters.category ? { category: filters.category } : {}), ...(filters.priority ? { priority: filters.priority } : {}) }
      if (filters.from || filters.to) filter.createdAt = createdAtRange(filters.from, filters.to)
      const [total, byStatus, byCategory, byZone, priorities, resolvedRows] = await Promise.all([
        ReportModel.countDocuments(filter),
        ReportModel.aggregate([{ $match: filter }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
        ReportModel.aggregate([{ $match: filter }, { $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
        ReportModel.aggregate([{ $match: filter }, { $group: { _id: { $ifNull: ['$zone.name', 'Unspecified'] }, count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
        ReportModel.countDocuments({ ...filter, priority: { $in: ['high', 'urgent'] }, status: { ...(filter.status ? (typeof filter.status === 'object' ? filter.status : { $in: [filter.status] }) : {}), $nin: ['resolved', 'rejected', 'duplicate'] } }),
        ReportModel.aggregate([{ $match: { ...filter, resolvedAt: { $type: 'date' }, createdAt: { ...(filter.createdAt || {}), $type: 'date' } } }, { $project: { duration: { $subtract: ['$resolvedAt', '$createdAt'] } } }, { $group: { _id: null, averageMs: { $avg: '$duration' }, count: { $sum: 1 } } }]),
      ])
      const status = Object.fromEntries(byStatus.map(({ _id, count }) => [_id, count]))
      const avg = resolvedRows[0]?.count >= 1 ? resolvedRows[0].averageMs : null
      response.json({ success: true, data: { total, pending: (status.submitted || 0) + (status.under_review || 0), inProgress: ['assigned', 'in_progress', 'submitted_for_verification', 'reopened'].reduce((sum, key) => sum + (status[key] || 0), 0), resolved: status.resolved || 0, awaitingReview: status.under_review || 0, highPriorityOpen: priorities, averageResolutionMs: avg, byStatus, byCategory, byZone } })
    },

    hotspots: async (request, response) => {
      const filters = parseAdminFilters({ ...request.query, limit: 1 })
      const match = { 'location.point': { $exists: true }, ...(filters.zoneId ? { 'zone.zoneId': filters.zoneId } : {}), ...(filters.status ? { status: statusFilter(filters.status) } : {}), ...(filters.category ? { category: filters.category } : {}), ...(filters.priority ? { priority: filters.priority } : {}) }
      if (filters.from || filters.to) match.createdAt = createdAtRange(filters.from, filters.to)
      const cells = await ReportModel.aggregate([
        { $match: match },
        { $project: { longitude: { $arrayElemAt: ['$location.point.coordinates', 0] }, latitude: { $arrayElemAt: ['$location.point.coordinates', 1] } } },
        { $group: { _id: { lat: { $floor: { $divide: ['$latitude', 0.002] } }, lng: { $floor: { $divide: ['$longitude', 0.002] } } }, count: { $sum: 1 }, latitude: { $avg: '$latitude' }, longitude: { $avg: '$longitude' } } },
        { $match: { count: { $gte: 3 } } }, { $sort: { count: -1 } }, { $limit: 100 },
      ])
      response.json({ success: true, data: { method: 'Approximate 0.002-degree grid; only cells with at least 3 geolocated reports are shown. This is report concentration, not verified waste prevalence.', sufficientData: cells.length > 0, cells } })
    },

    moderate: async (request, response) => {
      if (!mongoose.isValidObjectId(request.params.id)) throw notFound()
      const report = await ReportModel.findById(request.params.id)
      if (!report) throw notFound()
      const { category, priority, status, note, aiDecision } = request.validatedBody
      const changes = {}
      if (aiDecision && !report.aiAnalysis) throw new AppError(409, 'AI_ANALYSIS_NOT_FOUND', 'This report has no stored AI analysis to review.')
      for (const key of ['category', 'priority']) if (request.validatedBody[key] && report[key] !== request.validatedBody[key]) { changes[key] = { from: report[key], to: request.validatedBody[key] }; report[key] = request.validatedBody[key] }
      if (status && report.status !== status) {
        changes.status = { from: report.status, to: status }
        // Shared transition service enforces the established workflow and records history.
        await transitionReportStatus({ report, toStatus: status, actorId: request.user.id, note: note || 'Updated during administrative review' })
      }
      if (aiDecision && report.aiAnalysis) {
        report.aiAnalysis.reviewedBy = request.user.id; report.aiAnalysis.reviewedAt = new Date(); report.aiAnalysis.reviewDecision = aiDecision
        changes.aiDecision = aiDecision
      }
      if (note) { report.moderationNotes ||= []; report.moderationNotes.push({ author: request.user.id, body: note }); changes.noteAdded = true }
      if (Object.keys(changes).length) {
        await report.save()
        await AuditModel?.create({ actor: request.user.id, action: 'report_moderated', targetType: 'Report', targetId: report._id, changes })
      }
      response.json({ success: true, data: { report: serializeReport(report, { admin: true }) } })
    },

    linkDuplicate: async (request, response) => {
      const { relatedReportId, markDuplicate, note } = request.validatedBody
      if (!mongoose.isValidObjectId(request.params.id) || String(request.params.id) === relatedReportId) throw badRequest('Choose a different valid report')
      const [report, related] = await Promise.all([ReportModel.findById(request.params.id), ReportModel.findById(relatedReportId)])
      if (!report || !related) throw notFound()
      report.relatedReports ||= []; related.relatedReports ||= []; report.moderationNotes ||= []
      const linkedIds = new Set(report.relatedReports.map(String))
      if (!linkedIds.has(relatedReportId)) report.relatedReports.push(related._id)
      const peerIds = new Set(related.relatedReports.map(String))
      if (!peerIds.has(String(report._id))) related.relatedReports.push(report._id)
      if (note) report.moderationNotes.push({ author: request.user.id, body: note })
      await Promise.all([report.save(), related.save()])
      if (markDuplicate && report.status !== 'duplicate') await transitionReportStatus({ report, toStatus: 'duplicate', actorId: request.user.id, note: note || `Linked as a possible duplicate of ${related.reportNumber}` })
      await AuditModel?.create({ actor: request.user.id, action: 'duplicate_linked', targetType: 'Report', targetId: report._id, changes: { relatedReportId: String(related._id), markDuplicate } })
      response.json({ success: true, data: { report: serializeReport(report, { admin: true }), relatedReportId: String(related._id) } })
    },

    duplicateCandidates: async (request, response) => {
      if (!mongoose.isValidObjectId(request.params.id)) throw notFound()
      const report = await ReportModel.findById(request.params.id).lean()
      if (!report) throw notFound()
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const candidates = await ReportModel.find({ _id: { $ne: report._id }, category: report.category, createdAt: { $gte: since }, status: { $ne: 'duplicate' } }).select('reportNumber category status createdAt description location relatedReports').sort({ createdAt: -1 }).limit(100).lean()
      const items = candidates.flatMap((candidate) => {
        const meters = distanceMeters(report.location?.point, candidate.location?.point)
        const text = textSimilarity(report.description, candidate.description)
        const sameArea = meters !== null && meters <= 300
        if (!sameArea && text < 0.3) return []
        return [{ id: String(candidate._id), reportNumber: candidate.reportNumber, category: candidate.category, status: candidate.status, createdAt: candidate.createdAt, distanceMeters: meters === null ? null : Math.round(meters), textSimilarity: Math.round(text * 100) / 100, reasons: [sameArea ? 'within 300 m' : null, text >= 0.3 ? 'similar description' : null].filter(Boolean) }]
      }).sort((a, b) => Number(b.distanceMeters !== null && b.distanceMeters <= 300) - Number(a.distanceMeters !== null && a.distanceMeters <= 300) || b.textSimilarity - a.textSimilarity).slice(0, 10)
      response.json({ success: true, data: { items, method: 'Same category within 7 days; flagged for proximity within 300 m or token Jaccard similarity >= 0.30. These are review candidates, not confirmed duplicates.' } })
    },

    auditHistory: async (request, response) => {
      if (!mongoose.isValidObjectId(request.params.id)) throw notFound()
      const report = await ReportModel.findById(request.params.id).select('_id').lean()
      if (!report) throw notFound()
      const events = await AuditModel?.find({ targetType: 'Report', targetId: report._id }).sort({ createdAt: -1 }).limit(100).lean() || []
      response.json({ success: true, data: { events } })
    },

    recentAudit: async (_request, response) => {
      const events = await AuditModel?.find().sort({ createdAt: -1 }).limit(100).lean() || []
      response.json({ success: true, data: { events } })
    },

    getById: async (request, response) => {
      if (!mongoose.isValidObjectId(request.params.id)) throw notFound()
      const report = await ReportModel.findById(request.params.id).lean()
      if (!report || (String(report.reporter) !== request.user.id && request.user.role !== 'admin')) throw notFound()
      response.json({ success: true, data: { report: serializeReport(report, { admin: request.user.role === 'admin' }) } })
    },

    update: async (request, response) => {
      if (!mongoose.isValidObjectId(request.params.id)) throw notFound()
      const report = await ReportModel.findById(request.params.id)
      if (!report || String(report.reporter) !== request.user.id) throw notFound()
      if (report.status !== 'submitted') throw new AppError(409, 'REPORT_LOCKED', 'This report can no longer be edited because review has started.')
      const updates = request.validatedBody
      if (updates.zoneId !== undefined) {
        const zone = await ZoneModel.findOne({ zoneId: updates.zoneId, isActive: true }).lean()
        if (!zone) throw badRequest('Choose an available pilot zone', [{ field: 'zoneId', message: 'This pilot zone is not available.' }])
        report.zone = { zoneId: zone.zoneId, name: zone.name, boundaryVerified: zone.boundaryVerified }
      }
      if (updates.description !== undefined) report.description = updates.description
      if (updates.category !== undefined) report.category = updates.category
      await report.save()
      response.json({ success: true, data: { report: serializeReport(report) } })
    },

    listZones: async (_request, response) => {
      const zones = await ZoneModel.find({ isActive: true }).sort({ name: 1 }).lean()
      response.json({ success: true, data: { zones: zones.map(({ zoneId, name, description, boundaryVerified }) => ({ zoneId, name, description, boundaryVerified })), imageUploadEnabled: imageStorage.enabled } })
    },

    dashboardStats: async (request, response) => {
      const base = { reporter: request.user.id }
      const [total, awaitingReview, inProgress, resolved, recent] = await Promise.all([
        ReportModel.countDocuments(base),
        ReportModel.countDocuments({ ...base, status: { $in: initialStatuses } }),
        ReportModel.countDocuments({ ...base, status: { $in: ['assigned', 'in_progress', 'submitted_for_verification', 'reopened'] } }),
        ReportModel.countDocuments({ ...base, status: 'resolved' }),
        ReportModel.find(base).sort({ createdAt: -1, _id: -1 }).limit(5).lean(),
      ])
      response.json({ success: true, data: { stats: { total, awaitingReview, inProgress, resolved }, recent: recent.map(serializeReport) } })
    },
  }
}
