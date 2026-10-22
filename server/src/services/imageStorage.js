import { v2 as cloudinary } from 'cloudinary'
import { AppError } from '../utils/errors.js'

export function createImageStorage(config, cloudinaryClient = cloudinary) {
  if (!config?.cloudinary) {
    return {
      enabled: false,
      async upload() { throw new AppError(503, 'IMAGE_STORAGE_NOT_CONFIGURED', 'Image storage is not configured. Contact the project administrator.') },
      async remove() {},
    }
  }

  cloudinaryClient.config({ cloud_name: config.cloudinary.cloudName, api_key: config.cloudinary.apiKey, api_secret: config.cloudinary.apiSecret, secure: true })
  return {
    enabled: true,
    upload(buffer, { contentType }) {
      return new Promise((resolve, reject) => {
        const stream = cloudinaryClient.uploader.upload_stream({
          folder: 'swachhai/reports', resource_type: 'image', allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
          transformation: [{ width: 2400, height: 2400, crop: 'limit' }, { quality: 'auto', fetch_format: 'auto' }],
        }, (error, result) => {
          if (error || !result) return reject(new AppError(502, 'IMAGE_STORAGE_FAILED', 'The image could not be stored. Please try again.'))
          resolve({ provider: 'cloudinary', assetId: result.public_id, secureUrl: result.secure_url, contentType, size: buffer.length, uploadedAt: new Date() })
        })
        stream.end(buffer)
      })
    },
    async remove(assetId) {
      await cloudinaryClient.uploader.destroy(assetId, { resource_type: 'image', invalidate: true })
    },
  }
}
