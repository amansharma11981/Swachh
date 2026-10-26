import mongoose from 'mongoose'

export const REPORT_CATEGORIES = [
  'general_garbage', 'plastic_waste', 'organic_waste', 'construction_debris',
  'overflowing_dustbin', 'public_area_litter', 'drain_blockage', 'other',
]
export const REPORT_STATUSES = ['submitted', 'under_review', 'assigned', 'in_progress', 'submitted_for_verification', 'resolved', 'rejected', 'duplicate', 'reopened']

const imageSchema = new mongoose.Schema({
  provider: { type: String, enum: ['cloudinary'], required: true },
  assetId: { type: String, required: true },
  secureUrl: { type: String, required: true },
  contentType: { type: String, enum: ['image/jpeg', 'image/png', 'image/webp'], required: true },
  size: { type: Number, required: true, min: 1 },
  uploadedAt: { type: Date, default: Date.now },
}, { _id: false })

const pointSchema = new mongoose.Schema({
  type: { type: String, enum: ['Point'], default: 'Point', required: true },
  coordinates: { type: [Number], required: true, validate: { validator: (value) => value.length === 2 && value[0] >= -180 && value[0] <= 180 && value[1] >= -90 && value[1] <= 90, message: 'Coordinates must be [longitude, latitude]' } },
}, { _id: false })

const statusHistorySchema = new mongoose.Schema({
  fromStatus: { type: String, enum: [...REPORT_STATUSES, null], default: null },
  toStatus: { type: String, enum: REPORT_STATUSES, required: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  timestamp: { type: Date, default: Date.now },
  note: { type: String, maxlength: 300, default: '' },
}, { _id: false })

const taskNoteSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  body: { type: String, required: true, trim: true, minlength: 1, maxlength: 500 },
  createdAt: { type: Date, default: Date.now },
}, { _id: false })

const assignmentHistorySchema = new mongoose.Schema({
  action: { type: String, enum: ['assigned', 'reassigned', 'assignment_updated', 'accepted', 'status_changed', 'note_added', 'evidence_added', 'submitted_for_verification', 'approved', 'returned'], required: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fromWorker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  toWorker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  fromStatus: { type: String, enum: [...REPORT_STATUSES, null], default: null },
  toStatus: { type: String, enum: REPORT_STATUSES },
  note: { type: String, trim: true, maxlength: 500, default: '' },
  timestamp: { type: Date, default: Date.now },
}, { _id: false })

const aiAnalysisSchema = new mongoose.Schema({
  provider: { type: String, enum: ['openai', 'groq'], required: true },
  model: { type: String, required: true },
  status: { type: String, enum: ['completed', 'inconclusive'], required: true },
  suggestedCategory: { type: String, enum: REPORT_CATEGORIES, default: null },
  suggestedPriority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: null },
  summary: { type: String, trim: true, maxlength: 300, default: '' },
  priorityRationale: { type: String, trim: true, maxlength: 300, default: '' },
  recommendedAction: { type: String, trim: true, maxlength: 300, default: '' },
  confidence: { type: Number, min: 0, max: 1, default: null },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: { type: Date, default: null },
  reviewDecision: { type: String, enum: ['accepted', 'corrected', 'inconclusive', null], default: null },
}, { _id: false })

const moderationNoteSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  body: { type: String, required: true, trim: true, minlength: 1, maxlength: 1000 },
  createdAt: { type: Date, default: Date.now },
}, { _id: false })

const reportSchema = new mongoose.Schema({
  reportNumber: { type: String, required: true, unique: true, immutable: true },
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
  description: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
  category: { type: String, enum: REPORT_CATEGORIES, required: true },
  location: {
    label: { type: String, required: true, trim: true, maxlength: 200 },
    source: { type: String, enum: ['manual', 'gps'], required: true },
    point: { type: pointSchema, default: undefined },
    capturedAt: { type: Date },
  },
  zone: { zoneId: { type: String, trim: true }, name: { type: String, trim: true }, boundaryVerified: { type: Boolean, default: false } },
  images: { type: [imageSchema], required: true, validate: { validator: (items) => items.length > 0, message: 'At least one image is required' } },
  status: { type: String, enum: REPORT_STATUSES, default: 'submitted', required: true },
  priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal', required: true },
  aiAnalysis: { type: aiAnalysisSchema, default: undefined },
  moderationNotes: { type: [moderationNoteSchema], default: [] },
  relatedReports: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Report' }],
  statusHistory: { type: [statusHistorySchema], default: [] },
  assignedWorker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  assignedAt: { type: Date, default: null },
  dueAt: { type: Date, default: null },
  assignmentStatus: { type: String, enum: ['unassigned', 'active', 'submitted_for_verification', 'needs_work', 'completed'], default: 'unassigned' },
  progressNotes: { type: [taskNoteSchema], default: [] },
  completionEvidence: { type: [imageSchema], default: [] },
  assignmentHistory: { type: [assignmentHistorySchema], default: [] },
  verificationNote: { type: String, trim: true, maxlength: 500, default: '' },
  resolvedAt: { type: Date, default: null },
}, { timestamps: true, strict: 'throw', optimisticConcurrency: true })

reportSchema.index({ reporter: 1, createdAt: -1 })
reportSchema.index({ assignedWorker: 1, status: 1, updatedAt: -1 })
reportSchema.index({ status: 1, createdAt: -1 })
reportSchema.index({ 'location.point': '2dsphere' })
reportSchema.index({ category: 1, priority: 1, createdAt: -1 })
reportSchema.index({ 'zone.zoneId': 1, createdAt: -1 })

export const Report = mongoose.models.Report || mongoose.model('Report', reportSchema)

export const ReportCounter = mongoose.models.ReportCounter || mongoose.model('ReportCounter', new mongoose.Schema({
  _id: { type: String, required: true },
  sequence: { type: Number, default: 0 },
}))
