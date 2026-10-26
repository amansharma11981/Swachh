import { REPORT_STATUSES } from '../models/Report.js'
import { AppError, badRequest } from '../utils/errors.js'

const statusTransitions = Object.freeze({
  submitted: ['under_review', 'rejected', 'duplicate'],
  under_review: ['assigned', 'rejected', 'duplicate'],
  assigned: ['in_progress', 'under_review'],
  in_progress: ['submitted_for_verification', 'resolved', 'under_review'],
  submitted_for_verification: ['resolved', 'in_progress', 'reopened'],
  resolved: ['reopened'],
  rejected: ['reopened'],
  duplicate: [],
  reopened: ['under_review', 'assigned'],
})

export async function nextReportNumber(CounterModel) {
  const counter = await CounterModel.findOneAndUpdate(
    { _id: 'citizen-reports' }, { $inc: { sequence: 1 } }, { upsert: true, new: true, setDefaultsOnInsert: true },
  )
  return `SW-${String(counter.sequence).padStart(6, '0')}`
}

export async function transitionReportStatus({ report, toStatus, actorId, note = '' }) {
  if (!REPORT_STATUSES.includes(toStatus)) throw badRequest('Unknown report status')
  if (!statusTransitions[report.status]?.includes(toStatus)) {
    throw new AppError(409, 'INVALID_STATUS_TRANSITION', `A report cannot move from ${report.status} to ${toStatus}`)
  }
  const fromStatus = report.status
  report.status = toStatus
  if (toStatus === 'resolved') report.resolvedAt = new Date()
  if (toStatus === 'reopened') report.resolvedAt = null
  report.statusHistory.push({ fromStatus, toStatus, actor: actorId, timestamp: new Date(), note: note.slice(0, 300) })
  return report.save()
}

export function serializeReport(report, { admin = false } = {}) {
  if (!report) return null
  const value = typeof report.toObject === 'function' ? report.toObject() : { ...report }
  const { __v, ...safe } = value
  if (!admin) { delete safe.moderationNotes; delete safe.relatedReports }
  return { ...safe, id: String(safe.id || safe._id), reporter: String(safe.reporter?._id || safe.reporter) }
}
