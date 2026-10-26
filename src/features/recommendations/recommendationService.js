import { apiRequest } from '../../services/apiClient.js'

export const recommendationService = {
  list: () => apiRequest('/recommendations/admin?limit=20'),
  generate: (filters) => apiRequest('/recommendations/admin/generate', { method: 'POST', body: filters }),
  review: (id, values) => apiRequest(`/recommendations/admin/${encodeURIComponent(id)}/review`, { method: 'PATCH', body: values }),
  outcome: (id) => apiRequest(`/recommendations/admin/${encodeURIComponent(id)}/outcome`),
}
