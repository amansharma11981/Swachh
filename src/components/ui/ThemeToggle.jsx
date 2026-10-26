import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../features/theme/ThemeProvider.jsx'

export default function ThemeToggle() {
  const { preference, setPreference } = useTheme()
  const isLight = document.documentElement.dataset.theme === 'light'
  const next = isLight ? 'dark' : 'light'
  return <button className="theme-toggle" type="button" onClick={() => setPreference(next)} aria-label={`Switch to ${next} theme`} title={`Switch to ${next} theme`}>
    {isLight ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />}
    <span>{preference === 'system' ? 'System' : isLight ? 'Light' : 'Dark'}</span>
  </button>
}
