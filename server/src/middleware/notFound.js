import { notFound } from '../utils/errors.js'

export function notFoundHandler(_request, _response, next) { next(notFound()) }
