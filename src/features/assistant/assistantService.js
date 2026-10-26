import { apiRequest } from '../../services/apiClient.js'

export const assistantService = {
  chat: (messages) => apiRequest('/assistant/chat', { method: 'POST', body: { messages } }),
  draft: (description) => apiRequest('/assistant/draft', { method: 'POST', body: { description } }),
}
