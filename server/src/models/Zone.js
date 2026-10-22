import mongoose from 'mongoose'

const zoneSchema = new mongoose.Schema({
  zoneId: { type: String, required: true, unique: true, trim: true, lowercase: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, maxlength: 300, default: '' },
  isActive: { type: Boolean, default: true },
  boundaryVerified: { type: Boolean, default: false },
}, { timestamps: true, strict: 'throw' })

export async function seedConfiguredZones(ZoneModel, zones) {
  const activeIds = zones?.map(({ zoneId }) => zoneId) || []
  await ZoneModel.updateMany({ zoneId: { $nin: activeIds } }, { $set: { isActive: false } })
  if (!activeIds.length) return
  await ZoneModel.bulkWrite(zones.map(({ zoneId, name }) => ({
    updateOne: { filter: { zoneId }, update: { $set: { name, isActive: true }, $setOnInsert: { description: '', boundaryVerified: false } }, upsert: true },
  })), { ordered: true })
}

export const Zone = mongoose.models.Zone || mongoose.model('Zone', zoneSchema)
