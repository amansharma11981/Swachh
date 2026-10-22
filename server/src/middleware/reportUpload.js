import multer from 'multer'
import { fileTypeFromBuffer } from 'file-type'
import { AppError, badRequest } from '../utils/errors.js'

const acceptedTypes = new Map([
  ['image/jpeg', 'jpg'], ['image/png', 'png'], ['image/webp', 'webp'],
])

export function createReportUpload({ maxFileSizeBytes }) {
  const parser = multer({ storage: multer.memoryStorage(), limits: { fileSize: maxFileSizeBytes, files: 1, fields: 8, fieldSize: 4096 } }).single('image')
  return [
    (request, response, next) => parser(request, response, (error) => {
      if (!error) return next()
      if (error.code === 'LIMIT_FILE_SIZE') return next(badRequest(`Image must be smaller than ${Math.floor(maxFileSizeBytes / 1024 / 1024)} MB`, [{ field: 'image', message: 'The selected image is too large.' }]))
      if (error instanceof multer.MulterError) return next(badRequest('Upload one supported image file.', [{ field: 'image', message: 'Select one image and try again.' }]))
      next(error)
    }),
    async (request, _response, next) => {
      if (!request.file) return next(badRequest('Choose an image to attach to this report.', [{ field: 'image', message: 'An image is required.' }]))
      try {
        const detected = await fileTypeFromBuffer(request.file.buffer)
        if (!detected || !acceptedTypes.has(detected.mime) || request.file.mimetype !== detected.mime) {
          return next(new AppError(415, 'UNSUPPORTED_IMAGE', 'Use a genuine JPEG, PNG, or WebP image.', [{ field: 'image', message: 'This file is not a supported image.' }]))
        }
        request.detectedImageType = detected.mime
        next()
      } catch (error) { next(error) }
    },
  ]
}
