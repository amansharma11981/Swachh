import { AppError, badRequest } from '../utils/errors.js'

const activeStatuses = ['assigned', 'in_progress', 'submitted_for_verification']
const maxEvidencePerCycle = 3
const maxEvidencePerTask = 15

function latestEvidenceCheckpoint(report) {
  return [...(report.assignmentHistory || [])].reverse().find((event) => ['returned', 'assigned', 'reassigned'].includes(event.action))
}

export function evidenceForCurrentCycle(report) {
  const checkpoint = latestEvidenceCheckpoint(report)
  if (!checkpoint) return report.completionEvidence || []
  const timestamp = new Date(checkpoint.timestamp).valueOf()
  return (report.completionEvidence || []).filter((image) => new Date(image.uploadedAt).valueOf() > timestamp)
}

export function assertCanAddEvidence(report) {
  if (report.status !== 'in_progress') throw new AppError(409, 'TASK_LOCKED', 'Evidence can only be added while work is in progress')
  if ((report.completionEvidence || []).length >= maxEvidencePerTask || evidenceForCurrentCycle(report).length >= maxEvidencePerCycle) {
    throw new AppError(409, 'EVIDENCE_LIMIT_REACHED', 'This work cycle has reached its completion photo limit')
  }
}

function history(report, values) {
  report.assignmentHistory ||= []
  report.assignmentHistory.push({ timestamp: new Date(), ...values })
}

export function assertWorkerOwnsTask(report, workerId) {
  if (!report || String(report.assignedWorker?._id || report.assignedWorker) !== String(workerId)) {
    throw new AppError(404, 'TASK_NOT_FOUND', 'Task not found')
  }
}

export async function assignReport({ report, worker, adminId, priority = 'normal', dueAt, reason = '' }) {
  if (!worker || worker.role !== 'worker' || worker.isActive !== true) throw badRequest('Choose an active worker account')
  if (!['submitted', 'under_review', 'reopened', 'assigned', 'in_progress'].includes(report.status)) {
    throw new AppError(409, 'REPORT_NOT_ASSIGNABLE', 'This report cannot be assigned in its current status')
  }
  const sameWorker = String(report.assignedWorker?._id || report.assignedWorker || '') === String(worker.id || worker._id)
  if (sameWorker && activeStatuses.includes(report.status)) {
    const nextDueAt = dueAt || null
    const oldDueAt = report.dueAt ? new Date(report.dueAt).valueOf() : null
    const nextDueAtValue = nextDueAt ? new Date(nextDueAt).valueOf() : null
    if (report.priority === priority && oldDueAt === nextDueAtValue) return report
    report.priority = priority
    report.dueAt = nextDueAt
    history(report, { action: 'assignment_updated', actor: adminId, fromWorker: worker.id || worker._id, toWorker: worker.id || worker._id, fromStatus: report.status, toStatus: report.status, note: reason || 'Priority or due date updated' })
    return report.save()
  }

  const fromWorker = report.assignedWorker || null
  const fromStatus = report.status
  const reassigned = Boolean(fromWorker)
  if (reassigned && reason.trim().length < 8) throw badRequest('Provide a reason of at least eight characters to reassign this task')
  report.assignedWorker = worker.id || worker._id
  report.assignedBy = adminId
  report.assignedAt = new Date()
  report.dueAt = dueAt || null
  report.priority = priority
  report.assignmentStatus = 'active'
  report.status = 'assigned'
  report.verificationNote = ''
  report.statusHistory ||= []
  report.statusHistory.push({ fromStatus, toStatus: 'assigned', actor: adminId, timestamp: new Date(), note: reason || (reassigned ? 'Task reassigned by administrator' : 'Task assigned by administrator') })
  history(report, { action: reassigned ? 'reassigned' : 'assigned', actor: adminId, fromWorker, toWorker: worker.id || worker._id, fromStatus, toStatus: 'assigned', note: reason })
  return report.save()
}

export async function acceptTask({ report, workerId }) {
  assertWorkerOwnsTask(report, workerId)
  if (report.status === 'in_progress') return report
  if (report.status !== 'assigned') throw new AppError(409, 'INVALID_TASK_TRANSITION', 'Only an assigned task can be accepted')
  report.status = 'in_progress'
  report.assignmentStatus = 'active'
  report.statusHistory ||= []
  report.statusHistory.push({ fromStatus: 'assigned', toStatus: 'in_progress', actor: workerId, timestamp: new Date(), note: 'Task accepted by worker' })
  history(report, { action: 'accepted', actor: workerId, fromStatus: 'assigned', toStatus: 'in_progress', toWorker: workerId })
  return report.save()
}

export async function addTaskNote({ report, workerId, body }) {
  assertWorkerOwnsTask(report, workerId)
  if (!['assigned', 'in_progress'].includes(report.status)) throw new AppError(409, 'TASK_LOCKED', 'Progress notes can only be added to active tasks')
  report.progressNotes ||= []
  report.progressNotes.push({ author: workerId, body, createdAt: new Date() })
  history(report, { action: 'note_added', actor: workerId, toWorker: workerId, toStatus: report.status, note: body })
  return report.save()
}

export async function addTaskEvidence({ report, workerId, image }) {
  assertWorkerOwnsTask(report, workerId)
  assertCanAddEvidence(report)
  report.completionEvidence ||= []
  report.completionEvidence.push(image)
  history(report, { action: 'evidence_added', actor: workerId, toWorker: workerId, toStatus: report.status, note: 'Completion photo added' })
  return report.save()
}

export async function submitTaskForVerification({ report, workerId }) {
  assertWorkerOwnsTask(report, workerId)
  if (report.status !== 'in_progress') throw new AppError(409, 'INVALID_TASK_TRANSITION', 'Only work in progress can be submitted for verification')
  if (!report.completionEvidence?.length) throw badRequest('Add at least one completion photo before submitting this task')
  if (!evidenceForCurrentCycle(report).length) {
    throw badRequest('Upload a new completion photo after the administrator requests further work')
  }
  report.status = 'submitted_for_verification'
  report.assignmentStatus = 'submitted_for_verification'
  report.statusHistory ||= []
  report.statusHistory.push({ fromStatus: 'in_progress', toStatus: 'submitted_for_verification', actor: workerId, timestamp: new Date(), note: 'Worker submitted the completed task for verification' })
  history(report, { action: 'submitted_for_verification', actor: workerId, fromStatus: 'in_progress', toStatus: 'submitted_for_verification', toWorker: workerId })
  return report.save()
}

export async function verifyTask({ report, adminId, approved, reason = '' }) {
  if (!report || report.status !== 'submitted_for_verification') throw new AppError(409, 'TASK_NOT_AWAITING_VERIFICATION', 'This task is not awaiting verification')
  const fromStatus = report.status
  const toStatus = approved ? 'resolved' : 'in_progress'
  report.status = toStatus
  report.assignmentStatus = approved ? 'completed' : 'needs_work'
  report.verificationNote = reason
  report.resolvedAt = approved ? new Date() : null
  report.statusHistory ||= []
  report.statusHistory.push({ fromStatus, toStatus, actor: adminId, timestamp: new Date(), note: reason || (approved ? 'Work approved by administrator' : 'Further work requested') })
  history(report, { action: approved ? 'approved' : 'returned', actor: adminId, fromStatus, toStatus, toWorker: report.assignedWorker, note: reason })
  return report.save()
}

export function taskStatusFilter(status) {
  if (!status) return undefined
  if (status === 'active') return { $in: ['assigned', 'in_progress'] }
  if (status === 'completed') return 'resolved'
  return status
}

export { activeStatuses }
