import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authService } from './authService.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState('loading')
  const [sessionError, setSessionError] = useState(null)

  useEffect(() => {
    let active = true
    authService.getCurrentUser().then(({ user: currentUser }) => {
      if (active) { setUser(currentUser); setStatus('authenticated') }
    }).catch((error) => {
      if (active) {
        setUser(null)
        setStatus('unauthenticated')
        if (error.status !== 401) setSessionError('We could not restore your session. Sign in again when the API is available.')
      }
    })
    return () => { active = false }
  }, [])

  const login = useCallback(async (input) => {
    const { user: loggedInUser } = await authService.login(input)
    setSessionError(null); setUser(loggedInUser); setStatus('authenticated')
    return loggedInUser
  }, [])
  const register = useCallback(async (input) => {
    const { user: newUser } = await authService.register(input)
    setSessionError(null); setUser(newUser); setStatus('authenticated')
    return newUser
  }, [])
  const logout = useCallback(async () => {
    await authService.logout()
    setUser(null); setStatus('unauthenticated'); setSessionError(null)
  }, [])

  const value = useMemo(() => ({ user, status, sessionError, login, register, logout }), [user, status, sessionError, login, register, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
