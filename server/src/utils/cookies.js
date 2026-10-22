export function sessionCookieOptions(config) {
  return { httpOnly: true, secure: config.cookieSecure, sameSite: config.cookieSameSite || 'lax', path: '/api/v1', maxAge: config.cookieMaxAge }
}

export function clearSessionCookie(response, config) {
  const { maxAge, ...options } = sessionCookieOptions(config)
  response.clearCookie(config.cookieName, options)
}
