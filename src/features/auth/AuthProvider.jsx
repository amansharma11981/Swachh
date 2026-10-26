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
    const result = await authService.register(input)
    if (!result.approvalRequired) {
      setSessionError(null); setUser(result.user); setStatus('authenticated')
    }
    return result
  }, [])
  const logout = useCallback(async () => {
    await authService.logout()
    setUser(null); setStatus('unauthenticated'); setSessionError(null)
  }, [])

  const updateProfile = useCallback(async (input) => {
    const { user: updatedUser } = await authService.updateMyProfile(input)
    setUser(updatedUser)
    return updatedUser
  }, [])

  const value = useMemo(() => ({ user, status, sessionError, login, register, logout, updateProfile }), [user, status, sessionError, login, register, logout, updateProfile])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
