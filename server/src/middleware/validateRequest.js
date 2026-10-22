import { badRequest } from '../utils/errors.js'

export function validateBody(schema) {
  return (request, _response, next) => {
    const result = schema.safeParse(request.body)
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message }))
      return next(badRequest('Check the highlighted fields and try again', details))
    }
    request.validatedBody = result.data
    next()
  }
}
