import mongoose from 'mongoose'

const zoneSchema = new mongoose.Schema({
  zoneId: { type: String, required: true, unique: true, trim: true, lowercase: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, maxlength: 300, default: '' },
  isActive: { type: Boolean, default: true },
  boundaryVerified: { type: Boolean, default: false },
  // Approximate center-radius for automatic report zone suggestions. This is not an official boundary.
  geofence: {
    latitude: { type: Number, min: -90, max: 90 },
    longitude: { type: Number, min: -180, max: 180 },
    radiusMeters: { type: Number, min: 100, max: 20000 },
  },
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
