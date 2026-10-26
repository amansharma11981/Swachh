import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Icon } from '../components/ui/Icons.jsx'
import { useAuth } from '../features/auth/AuthProvider.jsx'
import NotificationBell from '../components/layout/NotificationBell.jsx'
import ThemeToggle from '../components/ui/ThemeToggle.jsx'
import '../features/assistant/assistant.css'
import '../features/assistant/draft.css'

const navByArea = {
  app: [['app', 'Overview', 'activity'], ['app/report', 'New report', 'camera'], ['app/reports', 'My reports', 'route'], ['app/map', 'Cleanliness map', 'map'], ['app/assistant', 'Civic assistant', 'sparkles'], ['app/profile', 'Profile', 'users'], ['app/settings', 'Settings', 'activity']],
  worker: [['worker', 'Overview', 'activity'], ['worker/tasks', 'Assigned tasks', 'check'], ['worker/map', 'Team map', 'map'], ['worker/assistant', 'Civic assistant', 'sparkles'], ['worker/profile', 'Profile', 'users'], ['worker/settings', 'Settings', 'activity']],
  admin: [['admin', 'Overview', 'activity'], ['admin/reports', 'Reports', 'route'], ['admin/access-requests', 'Access requests', 'users'], ['admin/map', 'Operations map', 'map'], ['admin/workers', 'Workers', 'users'], ['admin/zones', 'Pilot zones', 'mapPin'], ['admin/analytics', 'Analytics', 'chart'], ['admin/assistant', 'Civic assistant', 'sparkles'], ['admin/profile', 'Profile', 'users'], ['admin/settings', 'Settings', 'activity']],
}
const headings = { app: 'CITIZEN SPACE', worker: 'FIELD TEAM', admin: 'OPERATIONS' }

export default function AppLayout({ area }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [logoutError, setLogoutError] = useState(location.state?.logoutError || '')
  const handleLogout = async () => {
    setLogoutError('')
    navigate('/', { replace: true })
    try { await logout() }
    catch {
      const message = 'Sign out could not reach the server. Your session is still active; try again.'
      const workspace = user?.role === 'admin' ? '/admin' : user?.role === 'worker' ? '/worker' : '/app'
      navigate(workspace, { replace: true, state: { logoutError: message } })
    }
  }

  return <div className="workspace">
    <a className="skip-link" href="#main-content">Skip to main content</a>
    <aside className="workspace-sidebar"><Link to="/" className="wordmark"><span className="brand-mark">S</span><span>swachh<span className="wordmark-ai">AI</span><small>{headings[area]}</small></span></Link><div className="workspace-label">WORKSPACE</div><nav aria-label={`${headings[area]} navigation`}>{navByArea[area].map(([path, label, icon]) => <NavLink end={path === area} key={path} to={`/${path}`}><Icon name={icon} size={17} />{label}<Icon className="nav-arrow" name="arrowUpRight" size={14} /></NavLink>)}</nav><div className="workspace-sidebar-foot"><span className="preview-dot" />{area === 'app' ? 'CITIZEN ACCOUNT' : area === 'worker' ? 'FIELD TEAM' : 'ADMIN OPERATIONS'}</div></aside>
    <div className="workspace-main"><header className="workspace-topbar"><span>SWACHHAI <b>/</b> {headings[area]} <span className="workspace-user">· {user?.name}</span></span><div className="workspace-account">{logoutError && <span role="alert">{logoutError}</span>}<ThemeToggle /><NotificationBell /><button type="button" onClick={handleLogout}>Sign out <Icon name="arrowUpRight" size={14} /></button><Link to="/" aria-label="Back to public homepage">Public site <Icon name="arrowUpRight" size={14} /></Link></div></header><nav className="workspace-mobile-nav" aria-label={`${headings[area]} quick navigation`}>{navByArea[area].map(([path, label, icon]) => <NavLink end={path === area} key={path} to={`/${path}`}><Icon name={icon} size={15} />{label}</NavLink>)}</nav><main id="main-content" className="workspace-content"><Outlet /></main></div>
  </div>
}
