import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import PublicLayout from '../layouts/PublicLayout.jsx'
import AppLayout from '../layouts/AppLayout.jsx'
import { ForbiddenPage, NotFoundPage } from '../pages/PlaceholderPage.jsx'
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
const AdminDashboardPage = lazy(() => import('../pages/AdminDashboardPage.jsx'))
const ReportMapPage = lazy(() => import('../pages/ReportMapPage.jsx'))
const AssistantPage = lazy(() => import('../pages/AssistantPage.jsx'))
const ProfilePage = lazy(() => import('../pages/ProfilePage.jsx'))
const SettingsPage = lazy(() => import('../pages/SettingsPage.jsx'))
const ZonesPage = lazy(() => import('../pages/ZonesPage.jsx'))
const AdminZonesPage = lazy(() => import('../pages/AdminZonesPage.jsx'))
const AdminWorkersPage = lazy(() => import('../pages/AdminWorkersPage.jsx'))

function titleFor(path) {
  const clean = path.split('/').filter(Boolean)
  const name = clean.at(-1) || 'Overview'
  const labels = { app: 'Citizen dashboard', worker: 'Worker workspace', admin: 'Operations overview', report: 'Report an issue', reports: 'Reports', 'access-requests': 'Access requests', map: 'Cleanliness map', profile: 'Profile', tasks: 'Assigned tasks', analytics: 'Operational analytics', zones: 'Pilot zones', settings: 'Settings', assistant: 'Civic assistant', login: 'Sign in', register: 'Create account', impact: 'Impact & methodology', privacy: 'Privacy', accessibility: 'Accessibility', 'how-it-works': 'How it works' }
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
      <Route index element={area === 'app' ? <CitizenDashboardPage /> : area === 'worker' ? <WorkerDashboardPage /> : <AdminDashboardPage />} />
      <Route path="report" element={area === 'app' ? <ReportFormPage /> : <NotFoundPage />} />
      <Route path="reports" element={area === 'app' ? <MyReportsPage /> : area === 'admin' ? <AdminTaskPage /> : <NotFoundPage />} />
      <Route path="reports/:id" element={area === 'app' ? <ReportDetailPage /> : <NotFoundPage />} />
      <Route path="access-requests" element={area === 'admin' ? <AdminAccessRequestsPage /> : <NotFoundPage />} />
      <Route path="analytics" element={area === 'admin' ? <AdminDashboardPage /> : <NotFoundPage />} />
      <Route path="tasks" element={area === 'worker' ? <WorkerDashboardPage /> : <NotFoundPage />} />
      <Route path="tasks/:id" element={area === 'worker' ? <WorkerTaskPage /> : <NotFoundPage />} />
      <Route path="map" element={<ReportMapPage area={area} />} />
      <Route path="assistant" element={<AssistantPage />} />
      <Route path="profile" element={<ProfilePage />} />
      <Route path="zones" element={area === 'admin' ? <AdminZonesPage /> : <ZonesPage />} />
      <Route path="workers" element={area === 'admin' ? <AdminWorkersPage /> : <NotFoundPage />} />
      <Route path="settings" element={<SettingsPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>)}
    <Route path="*" element={<PublicLayout />}><Route path="*" element={<NotFoundPage />} /></Route>
  </Routes></Suspense>
}
