import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import PublicLayout from '../layouts/PublicLayout.jsx'
import AppLayout from '../layouts/AppLayout.jsx'
import { ForbiddenPage, NotFoundPage, PlaceholderPage } from '../pages/PlaceholderPage.jsx'
import ProtectedRoute from '../components/auth/ProtectedRoute.jsx'

const SimplePage = lazy(() => import('../pages/SimplePage.jsx'))
const LandingPage = lazy(() => import('../pages/LandingPage.jsx'))
const CitizenDashboardPage = lazy(() => import('../pages/CitizenDashboardPage.jsx'))
const ReportFormPage = lazy(() => import('../pages/ReportFormPage.jsx'))
const MyReportsPage = lazy(() => import('../pages/MyReportsPage.jsx'))
const ReportDetailPage = lazy(() => import('../pages/ReportDetailPage.jsx'))
const WorkerDashboardPage = lazy(() => import('../pages/WorkerDashboardPage.jsx'))
const WorkerTaskPage = lazy(() => import('../pages/WorkerTaskPage.jsx'))
const AdminTaskPage = lazy(() => import('../pages/AdminTaskPage.jsx'))
const AdminAccessRequestsPage = lazy(() => import('../pages/AdminAccessRequestsPage.jsx'))

function titleFor(path) {
  const clean = path.split('/').filter(Boolean)
  const name = clean.at(-1) || 'Overview'
  const labels = { app: 'Citizen dashboard', worker: 'Worker workspace', admin: 'Operations overview', report: 'Report an issue', reports: 'Reports', 'access-requests': 'Access requests', map: 'Cleanliness map', profile: 'Profile', tasks: 'Assigned tasks', bins: 'Smart-bin readiness', analytics: 'Operational analytics', zones: 'Pilot zones', settings: 'Settings', login: 'Sign in', register: 'Create account', impact: 'Impact & methodology', privacy: 'Privacy', accessibility: 'Accessibility', 'how-it-works': 'How it works' }
  return labels[name] || (name[0]?.toUpperCase() + name.slice(1))
}

export default function App() {
  return <Suspense fallback={<div className="page-loading" role="status">Loading SwachhAI…</div>}><Routes>
    <Route element={<PublicLayout />}>
      <Route path="/" element={<LandingPage />} />
      {['how-it-works', 'impact', 'login', 'register'].map((path) => <Route key={path} path={`/${path}`} element={<SimplePage title={titleFor(path)} />} />)}
      {['privacy', 'accessibility'].map((path) => <Route key={path} path={`/${path}`} element={<SimplePage title={titleFor(path)} />} />)}
      <Route path="/forbidden" element={<ForbiddenPage />} />
    </Route>
    {['app', 'worker', 'admin'].map((area) => <Route key={area} path={`/${area}`} element={<ProtectedRoute roles={area === 'app' ? ['citizen'] : [area]}><AppLayout area={area} /></ProtectedRoute>}>
      <Route index element={area === 'app' ? <CitizenDashboardPage /> : area === 'worker' ? <WorkerDashboardPage /> : <AdminTaskPage />} />
      <Route path="report" element={area === 'app' ? <ReportFormPage /> : <PlaceholderPage title="Report an issue" area={area} />} />
      <Route path="reports" element={area === 'app' ? <MyReportsPage /> : area === 'admin' ? <AdminTaskPage /> : <PlaceholderPage title="Reports" area={area} />} />
      <Route path="reports/:id" element={area === 'app' ? <ReportDetailPage /> : <PlaceholderPage title={area === 'admin' ? 'Report review' : 'Report detail'} area={area} />} />
      <Route path="access-requests" element={area === 'admin' ? <AdminAccessRequestsPage /> : <PlaceholderPage title="Access requests" area={area} />} />
      <Route path="tasks" element={area === 'worker' ? <WorkerDashboardPage /> : <PlaceholderPage title="Assigned tasks" area={area} />} />
      <Route path="tasks/:id" element={area === 'worker' ? <WorkerTaskPage /> : <PlaceholderPage title="Task detail" area={area} />} />
      <Route path="map" element={<PlaceholderPage title={area === 'admin' ? 'Operational map' : area === 'worker' ? 'Worker map' : 'Cleanliness map'} area={area} />} />
      <Route path="profile" element={<PlaceholderPage title="Profile" area={area} />} />
      <Route path="zones" element={<PlaceholderPage title="Pilot zones" area={area} />} />
      <Route path="workers" element={<PlaceholderPage title="Worker management" area={area} />} />
      <Route path="bins" element={<PlaceholderPage title="Smart-bin readiness" area={area} />} />
      <Route path="analytics" element={<PlaceholderPage title="Operational analytics" area={area} />} />
      <Route path="settings" element={<PlaceholderPage title="Settings" area={area} />} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>)}
    <Route path="*" element={<PublicLayout />}><Route path="*" element={<NotFoundPage />} /></Route>
  </Routes></Suspense>
}
