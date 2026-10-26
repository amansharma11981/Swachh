import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const ThemeContext = createContext(null)
const storageKey = 'swachhai-theme'

function savedPreference() {
  try {
    const value = localStorage.getItem(storageKey)
    return ['light', 'dark', 'system'].includes(value) ? value : 'system'
  } catch { return 'system' }
}

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(savedPreference)
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)') || { matches: false, addEventListener() {}, removeEventListener() {} }
    const apply = () => {
      const resolved = preference === 'system' ? (media.matches ? 'dark' : 'light') : preference
      document.documentElement.dataset.theme = resolved
      document.documentElement.style.colorScheme = resolved
      try { localStorage.setItem(storageKey, preference) } catch { /* Theme still works for this session. */ }
    }
    apply()
    if (preference === 'system') media.addEventListener?.('change', apply)
    return () => media.removeEventListener?.('change', apply)
  }, [preference])
  const value = useMemo(() => ({ preference, setPreference }), [preference])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used within ThemeProvider')
  return context
}
