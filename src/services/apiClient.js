export function normalizeApiBaseUrl(configuredBase = '') {
  const base = String(configuredBase || '/api/v1').trim().replace(/\/+$/, '') || '/api/v1'
  return /^https?:\/\/[^/]+$/i.test(base) ? `${base}/api/v1` : base
}

export const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL)

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'NETWORK_ERROR', details } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

function readError(payload, status) {
  const error = payload?.error || {}
  return new ApiError(error.message || 'The request could not be completed.', { status, code: error.code, details: error.details })
}

export function apiUpload(path, formData, { onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('POST', `${API_BASE_URL}${path}`)
    request.withCredentials = true
    request.setRequestHeader('X-Requested-With', 'XMLHttpRequest')
    request.setRequestHeader('Accept', 'application/json')
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100))
    }
    request.onerror = () => reject(new ApiError('Could not reach SwachhAI. Check that the API server is running and try again.'))
    request.onabort = () => reject(new ApiError('The upload was cancelled.'))
    request.onload = () => {
      let payload
      try { payload = request.responseText ? JSON.parse(request.responseText) : null } catch { payload = null }
      if (request.status < 200 || request.status >= 300) return reject(readError(payload, request.status))
      resolve(payload?.data ?? payload)
    }
    request.send(formData)
  })
}

export async function apiRequest(path, options = {}) {
  const { body, headers, ...rest } = options
  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      credentials: 'include',
      headers: { 'X-Requested-With': 'XMLHttpRequest', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  } catch {
    throw new ApiError('Could not reach SwachhAI. Check that the API server is running and try again.')
  }

  const payload = response.status === 204 ? null : await response.json().catch(() => null)
  if (!response.ok) {
    const error = payload?.error || {}
    throw new ApiError(error.message || 'The request could not be completed.', { status: response.status, code: error.code, details: error.details })
  }
  return payload?.data ?? payload
}
