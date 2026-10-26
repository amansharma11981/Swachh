import mongoose from 'mongoose'
import { AppError, notFound } from '../utils/errors.js'
import { serializeReport } from '../services/reportService.js'
import { acceptTask, addTaskEvidence, addTaskNote, assertCanAddEvidence, assignReport, assertWorkerOwnsTask, submitTaskForVerification, taskStatusFilter, verifyTask } from '../services/taskService.js'
import { parseTaskQuery } from '../validators/taskValidators.js'

const adminQueueStatuses = ['submitted', 'under_review', 'reopened', 'assigned', 'in_progress', 'submitted_for_verification']

function reportNumberSearch(query) {
  return new RegExp(`^${query.toUpperCase()}`)
}

async function pagedReports(Model, filter, page, limit, admin = false) {
  const [items, total] = await Promise.all([
    Model.find(filter).sort({ updatedAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Model.countDocuments(filter),
  ])
  return { items: items.map((item) => serializeReport(item, { admin })), pagination: { page, limit, total, pages: Math.ceil(total / limit) } }
}

export function taskController({ ReportModel, UserModel, imageStorage, AuditModel, notifications }) {
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
      const updated = await acceptTask({ report, workerId: request.user.id })
      await AuditModel?.create({ actor: request.user.id, action: 'task_status_changed', targetType: 'Report', targetId: updated._id, changes: { status: updated.status } })
      response.json({ success: true, data: { report: serializeReport(updated) } })
    },

    addNote: async (request, response) => {
      if (!mongoose.isValidObjectId(request.params.id)) throw notFound()
      const report = await ReportModel.findById(request.params.id)
      assertWorkerOwnsTask(report, request.user.id)
      const updated = await addTaskNote({ report, workerId: request.user.id, body: request.validatedBody.body })
      await AuditModel?.create({ actor: request.user.id, action: 'task_note_added', targetType: 'Report', targetId: updated._id, changes: { noteLength: request.validatedBody.body.length } })
      response.status(201).json({ success: true, data: { report: serializeReport(updated) } })
    },

    addEvidence: async (request, response) => {
      if (!imageStorage.enabled) throw new AppError(503, 'IMAGE_STORAGE_NOT_CONFIGURED', 'Image storage is not configured. Contact the project administrator.')
      if (!mongoose.isValidObjectId(request.params.id)) throw notFound()
      const report = await ReportModel.findById(request.params.id)
      assertWorkerOwnsTask(report, request.user.id)
      assertCanAddEvidence(report)
      const image = await imageStorage.upload(request.file.buffer, { contentType: request.detectedImageType, folder: 'swachhai/completion-evidence' })
      let updated
      try {
        updated = await addTaskEvidence({ report, workerId: request.user.id, image })
      } catch (error) {
        try { await imageStorage.remove(image.assetId) } catch { /* Best effort cleanup after a failed database write. */ }
        throw error
      }
      await AuditModel?.create({ actor: request.user.id, action: 'task_status_changed', targetType: 'Report', targetId: updated._id, changes: { completionEvidenceAdded: true } })
      response.status(201).json({ success: true, data: { report: serializeReport(updated) } })
    },

    submit: async (request, response) => {
      if (!mongoose.isValidObjectId(request.params.id)) throw notFound()
      const report = await ReportModel.findById(request.params.id)
      assertWorkerOwnsTask(report, request.user.id)
      const updated = await submitTaskForVerification({ report, workerId: request.user.id })
      await AuditModel?.create({ actor: request.user.id, action: 'task_status_changed', targetType: 'Report', targetId: updated._id, changes: { status: updated.status } })
      await notifications?.notifyAdmins({ eventKey: `report:${updated._id}:submitted-for-verification:${updated.updatedAt?.getTime?.() || Date.now()}`, type: 'task_submitted', title: 'Work ready for verification', message: `${updated.reportNumber} was submitted by its worker.`, href: '/admin/reports' })
      response.json({ success: true, data: { report: serializeReport(updated) } })
    },

    adminQueue: async (request, response) => {
      const { page, limit, q } = parseTaskQuery(request.query)
      const filter = { status: { $in: adminQueueStatuses }, ...(q ? { reportNumber: reportNumberSearch(q) } : {}) }
      response.json({ success: true, data: await pagedReports(ReportModel, filter, page, limit, true) })
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
      const previousWorkerId = report.assignedWorker ? String(report.assignedWorker) : null
      const worker = await UserModel.findSafeById(request.validatedBody.workerId)
      const updated = await assignReport({ report, worker, adminId: request.user.id, ...request.validatedBody, dueAt: request.validatedBody.dueAt ? new Date(request.validatedBody.dueAt) : null })
      await AuditModel?.create({ actor: request.user.id, action: 'task_assigned', targetType: 'Report', targetId: updated._id, changes: { assignedWorker: String(worker._id || worker.id), priority: updated.priority } })
      await notifications?.notify(worker._id || worker.id, { eventKey: `report:${updated._id}:assigned:${updated.assignmentHistory?.at(-1)?.timestamp?.getTime?.() || Date.now()}`, type: 'task_assigned', title: 'A task was assigned to you', message: `${updated.reportNumber} is ready in your task list.`, href: '/worker/tasks' })
      if (previousWorkerId && previousWorkerId !== String(worker._id || worker.id)) await notifications?.notify(previousWorkerId, { eventKey: `report:${updated._id}:reassigned:${updated.assignmentHistory?.at(-1)?.timestamp?.getTime?.() || Date.now()}`, type: 'task_assigned', title: 'A task was reassigned', message: `${updated.reportNumber} was moved to another worker.`, href: '/worker/tasks' })
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
      await AuditModel?.create({ actor: request.user.id, action: request.taskApproval ? 'task_verified' : 'task_returned', targetType: 'Report', targetId: updated._id, changes: { status: updated.status, reasonLength: request.validatedBody.reason.length } })
      await notifications?.notify(updated.reporter, { eventKey: `report:${updated._id}:verification:${updated.updatedAt?.getTime?.() || Date.now()}`, type: 'task_verified', title: request.taskApproval ? 'Work completed' : 'Work needs another review', message: `${updated.reportNumber} status is now ${updated.status.replaceAll('_', ' ')}.`, href: `/app/reports/${updated._id}` })
      response.json({ success: true, data: { report: serializeReport(updated) } })
    },
  }
}
