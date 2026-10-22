import 'dotenv/config'

const durationPattern = /^([1-9]\d*)(m|h|d)$/

export function parseDuration(value) {
  const match = durationPattern.exec(value || '')
  if (!match) throw new Error('JWT_EXPIRES_IN must use a duration such as 15m, 2h, or 1d.')
  const multiplier = { m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2]]
  const milliseconds = Number(match[1]) * multiplier
  if (!Number.isSafeInteger(milliseconds) || milliseconds > 7 * 86_400_000) throw new Error('JWT_EXPIRES_IN must not exceed seven days.')
  return milliseconds
}

export function loadConfig(env = process.env) {
  const nodeEnv = env.NODE_ENV || 'development'
  const mongoUri = env.MONGODB_URI?.trim()
  const jwtSecret = env.JWT_SECRET?.trim()
  if (!mongoUri) throw new Error('MONGODB_URI is required. Configure it in server/.env before starting the API.')
  if (!jwtSecret || jwtSecret.length < 32) throw new Error('JWT_SECRET must be configured with at least 32 characters.')
  if (nodeEnv === 'production' && env.COOKIE_SECURE !== 'true') throw new Error('COOKIE_SECURE=true is required in production.')
  const cookieSameSite = (env.COOKIE_SAME_SITE || 'lax').toLowerCase()
  if (!['lax', 'strict', 'none'].includes(cookieSameSite)) throw new Error('COOKIE_SAME_SITE must be lax, strict, or none.')
  if (cookieSameSite === 'none' && env.COOKIE_SECURE !== 'true') throw new Error('COOKIE_SECURE=true is required when COOKIE_SAME_SITE=none.')
  const expiresIn = env.JWT_EXPIRES_IN || '2h'
  const maxImageSizeBytes = Number(env.REPORT_MAX_IMAGE_SIZE_BYTES || 5 * 1024 * 1024)
  if (!Number.isInteger(maxImageSizeBytes) || maxImageSizeBytes < 1024 || maxImageSizeBytes > 20 * 1024 * 1024) throw new Error('REPORT_MAX_IMAGE_SIZE_BYTES must be between 1024 and 20971520.')
  const reportZones = (env.REPORT_ZONES || 'nit-more-street-food-lane=NIT More Street-Food Lane;ashok-rajpath=Ashok Rajpath construction/barrier zone;nit-gandhi-ghat=NIT / Gandhi Ghat')
    .split(';').map((entry) => {
      const separator = entry.indexOf('=')
      return separator < 1 ? null : { zoneId: entry.slice(0, separator).trim(), name: entry.slice(separator + 1).trim() }
    }).filter((zone) => zone?.zoneId && zone.name)
  if (new Set(reportZones.map((zone) => zone.zoneId)).size !== reportZones.length || reportZones.some(({ zoneId }) => !/^[a-z0-9][a-z0-9-]{0,79}$/.test(zoneId))) throw new Error('REPORT_ZONES must use unique lowercase zone-id=Name entries.')
  const cloudinarySettings = {
    cloudName: env.CLOUDINARY_CLOUD_NAME?.trim(), apiKey: env.CLOUDINARY_API_KEY?.trim(), apiSecret: env.CLOUDINARY_API_SECRET?.trim(),
  }
  const cloudinaryConfigured = Object.values(cloudinarySettings).every(Boolean)
  return Object.freeze({
    port: Number(env.PORT || 5000), nodeEnv, mongoUri, jwtSecret,
    jwtExpiresIn: expiresIn, cookieMaxAge: parseDuration(expiresIn),
    cookieName: env.COOKIE_NAME || 'swachhai_session',
    cookieSecure: env.COOKIE_SECURE === 'true' || nodeEnv === 'production',
    cookieSameSite,
    clientOrigins: (env.CLIENT_URL || 'http://localhost:5173').split(',').map((item) => item.trim()).filter(Boolean),
    maxImageSizeBytes,
    reportZones,
    cloudinary: cloudinaryConfigured ? cloudinarySettings : null,
  })
}
