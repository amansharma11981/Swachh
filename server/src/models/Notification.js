import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  eventKey: { type: String, required: true, maxlength: 180 },
  type: { type: String, enum: ['report_created', 'report_update', 'task_assigned', 'task_submitted', 'task_verified', 'access_request'], required: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  message: { type: String, required: true, trim: true, maxlength: 300 },
  href: { type: String, required: true, maxlength: 240 },
  readAt: { type: Date, default: null },
}, { timestamps: true, strict: 'throw' })

notificationSchema.index({ recipient: 1, createdAt: -1 })
notificationSchema.index({ recipient: 1, eventKey: 1 }, { unique: true })

export const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema)
