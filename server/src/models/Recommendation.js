import mongoose from 'mongoose'

const recommendationSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 100 },
  observation: { type: String, required: true, trim: true, maxlength: 500 },
  interpretation: { type: String, required: true, trim: true, maxlength: 500 },
  suggestedAction: { type: String, required: true, trim: true, maxlength: 500 },
  limitation: { type: String, required: true, trim: true, maxlength: 300 },
  priority: { type: String, enum: ['low', 'normal', 'high'], required: true },
  evidence: [{ key: { type: String, required: true }, label: { type: String, required: true }, value: { type: mongoose.Schema.Types.Mixed, required: true } }],
}, { _id: true, strict: 'throw' })

const recommendationRunSchema = new mongoose.Schema({
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  model: { type: String, required: true, maxlength: 100 },
  period: { start: { type: Date, required: true }, end: { type: Date, required: true } },
  filters: { category: String, zoneId: String, priority: String, status: String },
  evidence: { total: { type: Number, required: true }, locatedTotal: { type: Number, required: true }, sufficientEvidence: { type: Boolean, required: true } },
  recommendations: { type: [recommendationSchema], default: [] },
  status: { type: String, enum: ['new', 'reviewed', 'accepted', 'rejected', 'action_required', 'completed'], default: 'new', required: true },
  feedback: { type: String, trim: true, maxlength: 1000, default: '' },
  actionTaken: { type: String, trim: true, maxlength: 500, default: '' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: { type: Date, default: null },
  actionTakenAt: { type: Date, default: null },
}, { timestamps: true, strict: 'throw' })

recommendationRunSchema.index({ createdAt: -1 })
recommendationRunSchema.index({ status: 1, createdAt: -1 })

export const RecommendationRun = mongoose.models.RecommendationRun || mongoose.model('RecommendationRun', recommendationRunSchema)
