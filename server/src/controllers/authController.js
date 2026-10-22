import { sessionCookieOptions, clearSessionCookie } from '../utils/cookies.js'

export function authController({ authService, config }) {
  return {
    register: async (request, response) => {
      const result = await authService.register(request.validatedBody)
      response.cookie(config.cookieName, result.sessionToken, sessionCookieOptions(config))
      response.status(201).json({ success: true, data: { user: result.user } })
    },
    login: async (request, response) => {
      const result = await authService.login(request.validatedBody)
      response.cookie(config.cookieName, result.sessionToken, sessionCookieOptions(config))
      response.json({ success: true, data: { user: result.user } })
    },
    me: (request, response) => response.json({ success: true, data: { user: request.user } }),
    logout: (_request, response) => {
      clearSessionCookie(response, config)
      response.json({ success: true, data: { loggedOut: true } })
    },
  }
}
