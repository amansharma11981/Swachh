import { Check, Moon, Monitor, Sun } from 'lucide-react'
import { useTheme } from '../features/theme/ThemeProvider.jsx'

const choices = [
  { value: 'light', label: 'Light', description: 'Bright surfaces and dark text.', Icon: Sun },
  { value: 'dark', label: 'Dark', description: 'Low-light surfaces and light text.', Icon: Moon },
  { value: 'system', label: 'System', description: 'Follow your device setting.', Icon: Monitor },
]

export default function SettingsPage() {
  const { preference, setPreference } = useTheme()
  return <section className="workspace-page settings-page"><header className="page-heading"><span className="page-kicker">PREFERENCES</span><h1>Settings</h1><p>Choose how SwachhAI looks on this device.</p></header><section className="settings-section" aria-labelledby="appearance-title"><div><h2 id="appearance-title">Appearance</h2><p>Your theme is saved in this browser and applies across public pages and workspaces.</p></div><div className="theme-choice-grid" role="radiogroup" aria-label="Color theme">{choices.map(({ value, label, description, Icon }) => <button className={`theme-choice ${preference === value ? 'is-selected' : ''}`} key={value} type="button" role="radio" aria-checked={preference === value} onClick={() => setPreference(value)}><span className="theme-choice-icon"><Icon size={18} /></span><span><strong>{label}</strong><small>{description}</small></span>{preference === value && <Check className="theme-choice-check" size={17} />}</button>)}</div></section><p className="settings-note">Notifications are managed from the bell in the workspace header. Account details are on your profile page.</p></section>
}
