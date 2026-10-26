import Button from '../components/ui/Button.jsx'
import { useAuth } from '../features/auth/AuthProvider.jsx'
import { dashboardPath } from '../features/auth/authService.js'

export function NotFoundPage() {
  return <div className="not-found"><div className="eyebrow"><span className="eyebrow-line" />404 / PAGE NOT FOUND</div><h1>We lost<br />the trail<span className="accent-dot">.</span></h1><p>The page you’re looking for isn’t here. Let’s get you back to the beginning.</p><Button to="/" icon="arrowRight">Back to home</Button></div>
}

export function ForbiddenPage() {
  const { user } = useAuth()
  return <div className="not-found"><div className="eyebrow"><span className="eyebrow-line" />403 / RESTRICTED AREA</div><h1>This space<br />is not yours<span className="accent-dot">.</span></h1><p>Your account does not have access to this workspace. The API also checks access for protected operations.</p><Button to={user ? dashboardPath(user.role) : '/'} icon="arrowRight">{user ? 'Back to your workspace' : 'Back to home'}</Button></div>
}
