import mongoose from 'mongoose'

// Append-only by API design: there are no update/delete routes for audit records.
const auditLogSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  action: { type: String, required: true, enum: ['report_moderated', 'duplicate_linked', 'task_assigned', 'task_verified', 'task_returned', 'task_note_added', 'task_status_changed', 'user_role_changed', 'recommendation_reviewed', 'zone_geofence_updated'], immutable: true },
  targetType: { type: String, required: true, enum: ['Report', 'User', 'RecommendationRun', 'Zone'], immutable: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true, immutable: true },
  changes: { type: mongoose.Schema.Types.Mixed, default: {}, immutable: true },
}, { timestamps: { createdAt: true, updatedAt: false }, strict: 'throw' })
auditLogSchema.index({ targetType:  1, targetId: 1, createdAt: -1 })
auditLogSchema.index({ actor: 1, createdAt: -1 })
export const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema)
