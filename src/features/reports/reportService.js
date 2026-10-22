import { apiRequest, apiUpload } from '../../services/apiClient.js'

export const reportService = {
  createReport: (formData, onProgress) => apiUpload('/reports', formData, { onProgress }),
  getDashboard: () => apiRequest('/reports/dashboard'),
  getMyReports: ({ page = 1, limit = 10, status } = {}) => {
    const query = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (status) query.set('status', status)
    return apiRequest(`/reports/my?${query}`)
  },
  getReport: (id) => apiRequest(`/reports/${encodeURIComponent(id)}`),
  getZones: () => apiRequest('/reports/meta/zones'),
  updateReport: (id, changes) => apiRequest(`/reports/${encodeURIComponent(id)}`, { method: 'PATCH', body: changes }),
}

export const REPORT_CATEGORIES = [
  ['general_garbage', 'General garbage accumulation'],
  ['plastic_waste', 'Plastic waste'],
  ['organic_waste', 'Organic waste'],
  ['construction_debris', 'Construction debris'],
  ['overflowing_dustbin', 'Overflowing dustbin'],
  ['public_area_litter', 'Public-area litter'],
  ['drain_blockage', 'Drain blockage'],
  ['other', 'Other cleanliness issue'],
]

export const REPORT_STATUS_LABELS = {
  submitted: 'Submitted', under_review: 'Under review', assigned: 'Assigned',
  in_progress: 'In progress', resolved: 'Resolved', rejected: 'Not approved',
  duplicate: 'Duplicate', reopened: 'Reopened',
}

export function reportCategoryLabel(category) {
  return REPORT_CATEGORIES.find(([value]) => value === category)?.[1] || 'Cleanliness report'
}

export function reportDate(value, options = { dateStyle: 'medium', timeStyle: 'short' }) {
  if (!value) return 'Date unavailable'
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? 'Date unavailable' : new Intl.DateTimeFormat(undefined, options).format(date)
}
