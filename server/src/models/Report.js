import mongoose from 'mongoose'

export const REPORT_CATEGORIES = [
  'general_garbage', 'plastic_waste', 'organic_waste', 'construction_debris',
  'overflowing_dustbin', 'public_area_litter', 'drain_blockage', 'other',
]
export const REPORT_STATUSES = ['submitted', 'under_review', 'assigned', 'in_progress', 'resolved', 'rejected', 'duplicate', 'reopened']

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
  priority: { type: String, enum: ['normal'], default: 'normal', required: true },
  statusHistory: { type: [statusHistorySchema], default: [] },
  assignedWorker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  resolvedAt: { type: Date, default: null },
}, { timestamps: true, strict: 'throw' })

reportSchema.index({ reporter: 1, createdAt: -1 })

export const Report = mongoose.models.Report || mongoose.model('Report', reportSchema)

export const ReportCounter = mongoose.models.ReportCounter || mongoose.model('ReportCounter', new mongoose.Schema({
  _id: { type: String, required: true },
  sequence: { type: Number, default: 0 },
}))
