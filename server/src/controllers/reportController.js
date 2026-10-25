import mongoose from 'mongoose'
import { AppError, badRequest, notFound } from '../utils/errors.js'
import { nextReportNumber, serializeReport } from '../services/reportService.js'
import { parseReportQuery } from '../validators/reportValidators.js'

const initialStatuses = ['submitted', 'under_review']

async function pagedQuery(Model, filter, page, limit) {
  const [items, total] = await Promise.all([
    Model.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Model.countDocuments(filter),
  ])
  return { items: items.map(serializeReport), pagination: { page, limit, total, pages: Math.ceil(total / limit) } }
}

function statusFilter(status) {
  return status === 'in_progress' ? { $in: ['assigned', 'in_progress', 'submitted_for_verification', 'reopened'] } : status
}

export function reportController({ ReportModel, CounterModel, ZoneModel, imageStorage }) {
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
          images: [uploadedImage], status: 'submitted', priority: 'normal',
          statusHistory: [{ fromStatus: null, toStatus: 'submitted', actor: request.user.id, timestamp: new Date(), note: 'Report submitted by citizen' }],
        })
        response.status(201).json({ success: true, data: { report: serializeReport(report) } })
      } catch (error) {
        try { await imageStorage.remove(uploadedImage.assetId) } catch { /* Provider cleanup is best effort; do not hide the database failure. */ }
        throw error
      }
    },

    listMine: async (request, response) => {
      const { page, limit, status } = parseReportQuery(request.query)
      const filter = { reporter: request.user.id, ...(status ? { status: statusFilter(status) } : {}) }
      const result = await pagedQuery(ReportModel, filter, page, limit)
      response.json({ success: true, data: result })
    },

    listAll: async (request, response) => {
      const { page, limit, status } = parseReportQuery(request.query)
      response.json({ success: true, data: await pagedQuery(ReportModel, status ? { status: statusFilter(status) } : {}, page, limit) })
    },

    getById: async (request, response) => {
      if (!mongoose.isValidObjectId(request.params.id)) throw notFound()
      const report = await ReportModel.findById(request.params.id).lean()
      if (!report || (String(report.reporter) !== request.user.id && request.user.role !== 'admin')) throw notFound()
      response.json({ success: true, data: { report: serializeReport(report) } })
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
