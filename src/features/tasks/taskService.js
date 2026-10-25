import { apiRequest, apiUpload } from '../../services/apiClient.js'

export const taskService = {
  workerDashboard: () => apiRequest('/tasks/worker/dashboard'),
  workerTasks: ({ page = 1, limit = 8, status, q } = {}) => {
    const query = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (status) query.set('status', status)
    if (q) query.set('q', q)
    return apiRequest(`/tasks/worker/tasks?${query}`)
  },
  workerTask: (id) => apiRequest(`/tasks/worker/tasks/${encodeURIComponent(id)}`),
  accept: (id) => apiRequest(`/tasks/worker/tasks/${encodeURIComponent(id)}/accept`, { method: 'POST', body: {} }),
  addNote: (id, body) => apiRequest(`/tasks/worker/tasks/${encodeURIComponent(id)}/notes`, { method: 'POST', body: { body } }),
  addEvidence: (id, formData, onProgress) => apiUpload(`/tasks/worker/tasks/${encodeURIComponent(id)}/evidence`, formData, { onProgress }),
  submit: (id) => apiRequest(`/tasks/worker/tasks/${encodeURIComponent(id)}/submit`, { method: 'POST', body: {} }),
  adminQueue: ({ page = 1, limit = 10, q } = {}) => apiRequest(`/tasks/admin/queue?page=${page}&limit=${limit}${q ? `&q=${encodeURIComponent(q)}` : ''}`),
  adminWorkers: ({ page = 1, limit = 50 } = {}) => apiRequest(`/tasks/admin/workers?page=${page}&limit=${limit}`),
  assign: (id, values) => apiRequest(`/tasks/admin/${encodeURIComponent(id)}/assign`, { method: 'POST', body: values }),
  history: (id) => apiRequest(`/tasks/admin/${encodeURIComponent(id)}/history`),
  verify: (id, approved, reason = '') => apiRequest(`/tasks/admin/${encodeURIComponent(id)}/${approved ? 'approve' : 'return'}`, { method: 'POST', body: { reason } }),
}

export function taskLabel(status) {
  return ({ assigned: 'Assigned', in_progress: 'In progress', submitted_for_verification: 'Awaiting verification', resolved: 'Completed', needs_work: 'Needs further work', reopened: 'Reopened', under_review: 'Under review', submitted: 'Awaiting assignment' })[status] || status?.replaceAll('_', ' ') || 'Unknown'
}

export function taskDate(value) {
  if (!value) return 'No date set'
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? 'Date unavailable' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}
