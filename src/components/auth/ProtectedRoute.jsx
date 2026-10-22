import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../features/auth/AuthProvider.jsx'

export default function ProtectedRoute({ roles, children }) {
  const { user, status } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <div className="page-loading" role="status">Restoring your session…</div>
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (!roles.includes(user.role)) return <Navigate to="/forbidden" state={{ requestedPath: location.pathname }} replace />
  return children
}
