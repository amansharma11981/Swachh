import mongoose from 'mongoose'
import { AppError, notFound } from '../utils/errors.js'
import { serializeReport } from '../services/reportService.js'
import { acceptTask, addTaskEvidence, addTaskNote, assertCanAddEvidence, assignReport, assertWorkerOwnsTask, submitTaskForVerification, taskStatusFilter, verifyTask } from '../services/taskService.js'
import { parseTaskQuery } from '../validators/taskValidators.js'

const adminQueueStatuses = ['submitted', 'under_review', 'reopened', 'assigned', 'in_progress', 'submitted_for_verification']

function reportNumberSearch(query) {
  return new RegExp(`^${query.toUpperCase()}`)
}

async function pagedReports(Model, filter, page, limit) {
  const [items, total] = await Promise.all([
    Model.find(filter).sort({ updatedAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Model.countDocuments(filter),
  ])
  return { items: items.map(serializeReport), pagination: { page, limit, total, pages: Math.ceil(total / limit) } }
}

export function taskController({ ReportModel, UserModel, imageStorage }) {
  return {
    workerDashboard: async (request, response) => {
      const worker = request.user.id
      const [assigned, inProgress, awaitingVerification, completed, recent] = await Promise.all([
        ReportModel.countDocuments({ assignedWorker: worker, status: 'assigned' }),
        ReportModel.countDocuments({ assignedWorker: worker, status: { $in: ['in_progress'] } }),
        ReportModel.countDocuments({ assignedWorker: worker, status: 'submitted_for_verification' }),
        ReportModel.countDocuments({ assignedWorker: worker, status: 'resolved' }),
        ReportModel.find({ assignedWorker: worker }).sort({ updatedAt: -1, _id: -1 }).limit(5).lean(),
      ])
      response.json({ success: true, data: { stats: { assigned, inProgress, awaitingVerification, completed, awaitingAction: assigned + inProgress }, recent: recent.map(serializeReport) } })
    },

    workerTasks: async (request, response) => {
      const { page, limit, status, q } = parseTaskQuery(request.query)
      const statusValue = taskStatusFilter(status)
      const filter = { assignedWorker: request.user.id, ...(statusValue ? { status: statusValue } : {}), ...(q ? { reportNumber: reportNumberSearch(q) } : {}) }
      response.json({ success: true, data: await pagedReports(ReportModel, filter, page, limit) })
    },

    workerTask: async (request, response) => {
      if (!mongoose.isValidObjectId(request.params.id)) throw notFound()
      const report = await ReportModel.findById(request.params.id).lean()
      assertWorkerOwnsTask(report, request.user.id)
      response.json({ success: true, data: { report: serializeReport(report) } })
    },

    accept: async (request, response) => {
      if (!mongoose.isValidObjectId(request.params.id)) throw notFound()
      const report = await ReportModel.findById(request.params.id)
      assertWorkerOwnsTask(report, request.user.id)
      response.json({ success: true, data: { report: serializeReport(await acceptTask({ report, workerId: request.user.id })) } })
    },

    addNote: async (request, response) => {
      if (!mongoose.isValidObjectId(request.params.id)) throw notFound()
      const report = await ReportModel.findById(request.params.id)
      assertWorkerOwnsTask(report, request.user.id)
      response.status(201).json({ success: true, data: { report: serializeReport(await addTaskNote({ report, workerId: request.user.id, body: request.validatedBody.body })) } })
    },

    addEvidence: async (request, response) => {
      if (!imageStorage.enabled) throw new AppError(503, 'IMAGE_STORAGE_NOT_CONFIGURED', 'Image storage is not configured. Contact the project administrator.')
      if (!mongoose.isValidObjectId(request.params.id)) throw notFound()
      const report = await ReportModel.findById(request.params.id)
      assertWorkerOwnsTask(report, request.user.id)
      assertCanAddEvidence(report)
      const image = await imageStorage.upload(request.file.buffer, { contentType: request.detectedImageType, folder: 'swachhai/completion-evidence' })
      try {
        response.status(201).json({ success: true, data: { report: serializeReport(await addTaskEvidence({ report, workerId: request.user.id, image })) } })
      } catch (error) {
        try { await imageStorage.remove(image.assetId) } catch { /* Best effort cleanup after a failed database write. */ }
        throw error
      }
    },

    submit: async (request, response) => {
      if (!mongoose.isValidObjectId(request.params.id)) throw notFound()
      const report = await ReportModel.findById(request.params.id)
      assertWorkerOwnsTask(report, request.user.id)
      response.json({ success: true, data: { report: serializeReport(await submitTaskForVerification({ report, workerId: request.user.id })) } })
    },

    adminQueue: async (request, response) => {
      const { page, limit, q } = parseTaskQuery(request.query)
      const filter = { status: { $in: adminQueueStatuses }, ...(q ? { reportNumber: reportNumberSearch(q) } : {}) }
      response.json({ success: true, data: await pagedReports(ReportModel, filter, page, limit) })
    },

    adminWorkers: async (request, response) => {
      const { page, limit } = parseTaskQuery(request.query)
      const filter = { role: 'worker', isActive: true }
      const [workers, total] = await Promise.all([
        UserModel.find(filter).sort({ name: 1 }).skip((page - 1) * limit).limit(limit).lean(),
        UserModel.countDocuments(filter),
      ])
      const items = await Promise.all(workers.map(async (worker) => ({
        id: String(worker._id || worker.id), name: worker.name, email: worker.email,
        activeTasks: await ReportModel.countDocuments({ assignedWorker: worker._id || worker.id, status: { $in: ['assigned', 'in_progress', 'submitted_for_verification'] } }),
      })))
      response.json({ success: true, data: { items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } } })
    },

    assign: async (request, response) => {
      if (!mongoose.isValidObjectId(request.params.id)) throw notFound()
      const report = await ReportModel.findById(request.params.id)
      if (!report) throw notFound()
      const worker = await UserModel.findSafeById(request.validatedBody.workerId)
      const updated = await assignReport({ report, worker, adminId: request.user.id, ...request.validatedBody, dueAt: request.validatedBody.dueAt ? new Date(request.validatedBody.dueAt) : null })
      response.json({ success: true, data: { report: serializeReport(updated) } })
    },

    assignmentHistory: async (request, response) => {
      if (!mongoose.isValidObjectId(request.params.id)) throw notFound()
      const report = await ReportModel.findById(request.params.id).lean()
      if (!report) throw notFound()
      const history = report.assignmentHistory || []
      const userIds = [...new Set(history.flatMap((event) => [event.actor, event.fromWorker, event.toWorker]).filter(Boolean).map((id) => String(id?._id || id)))]
      const people = userIds.length ? await UserModel.find({ _id: { $in: userIds } }, { name: 1, role: 1 }).lean() : []
      const byId = new Map(people.map((person) => [String(person._id || person.id), person]))
      response.json({ success: true, data: { history: history.map((event) => ({
        ...event,
        actorName: byId.get(String(event.actor?._id || event.actor))?.name || 'Project team member',
        fromWorkerName: event.fromWorker ? byId.get(String(event.fromWorker?._id || event.fromWorker))?.name || 'Former assignee' : null,
        toWorkerName: event.toWorker ? byId.get(String(event.toWorker?._id || event.toWorker))?.name || 'Assigned worker' : null,
      })) } })
    },

    verify: async (request, response) => {
      if (!mongoose.isValidObjectId(request.params.id)) throw notFound()
      const report = await ReportModel.findById(request.params.id)
      if (!report) throw notFound()
      const updated = await verifyTask({ report, adminId: request.user.id, approved: request.taskApproval === true, reason: request.validatedBody.reason })
      response.json({ success: true, data: { report: serializeReport(updated) } })
    },
  }
}
