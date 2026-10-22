import { apiRequest } from '../../services/apiClient.js'

export const authService = {
  register: (input) => apiRequest('/auth/register', { method: 'POST', body: input }),
  login: (input) => apiRequest('/auth/login', { method: 'POST', body: input }),
  logout: () => apiRequest('/auth/logout', { method: 'POST', body: {} }),
  getCurrentUser: () => apiRequest('/auth/me'),
  getMyProfile: () => apiRequest('/users/me'),
  updateMyProfile: (input) => apiRequest('/users/me', { method: 'PATCH', body: input }),
}

export function dashboardPath(role) {
  return role === 'admin' ? '/admin' : role === 'worker' ? '/worker' : '/app'
}
