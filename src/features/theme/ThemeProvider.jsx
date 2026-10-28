import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const ThemeContext = createContext(null)
const storageKey = 'swachhai-theme'
const explicitKey = 'swachhai-theme-explicit'

function savedPreference() {
  try {
    const value = localStorage.getItem(storageKey)
    const explicit = localStorage.getItem(explicitKey) === 'true'
    if (value === 'light' || value === 'dark') return value
    if (value === 'system' && explicit) return 'system'
    return 'light'
  } catch {
    return 'light'
  }
}

export function ThemeProvider({ children }) {
  const [preference, setPreferenceState] = useState(savedPreference)
  const [isDarkMedia, setIsDarkMedia] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false
  })

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!media) return
    const onChange = (e) => setIsDarkMedia(e.matches)
    media.addEventListener?.('change', onChange)
    return () => media.removeEventListener?.('change', onChange)
  }, [])

  const setPreference = (nextPreference) => {
    setPreferenceState(nextPreference)
    try {
      localStorage.setItem(storageKey, nextPreference)
      localStorage.setItem(explicitKey, 'true')
    } catch {
      /* Theme still works for this session. */
    }
  }

  const resolvedTheme = preference === 'system' ? (isDarkMedia ? 'dark' : 'light') : preference
  const isLight = resolvedTheme === 'light'

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme
    document.documentElement.style.colorScheme = resolvedTheme
  }, [resolvedTheme])

  const value = useMemo(() => ({
    preference,
    setPreference,
    resolvedTheme,
    isLight,
  }), [preference, resolvedTheme, isLight])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}
