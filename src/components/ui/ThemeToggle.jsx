import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../features/theme/ThemeProvider.jsx'

export default function ThemeToggle({ className = '' }) {
  const { preference, setPreference, isLight: contextIsLight, resolvedTheme } = useTheme()
  const isLight = contextIsLight ?? (resolvedTheme ? resolvedTheme === 'light' : document.documentElement.dataset.theme !== 'dark')
  const next = isLight ? 'dark' : 'light'

  return (
    <button
      className={`theme-toggle ${className}`.trim()}
      type="button"
      onClick={() => setPreference(next)}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
    >
      {isLight ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />}
      <span className="theme-toggle-text">
        {preference === 'system' ? 'System' : isLight ? 'Light' : 'Dark'}
      </span>
    </button>
  )
}
