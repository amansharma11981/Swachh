import { apiRequest } from '../../services/apiClient.js'

export const notificationService = {
  list: () => apiRequest('/notifications?limit=20'),
  markRead: (id) => apiRequest(`/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' }),
  markAllRead: () => apiRequest('/notifications/read-all', { method: 'PATCH' }),
}
