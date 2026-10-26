import { Link, useParams } from 'react-router-dom'
import { Icon } from '../components/ui/Icons.jsx'
import Button from '../components/ui/Button.jsx'
import { useAuth } from '../features/auth/AuthProvider.jsx'
import { dashboardPath } from '../features/auth/authService.js'

export function PlaceholderPage({ title, area }) {
  const { id } = useParams()
  const name = id ? `${title} · ${id}` : title
  const summaries = { app: 'A future shared view for citizens to follow their reports and explore local cleanliness activity.', worker: 'A future workspace for reviewing assigned tasks and documenting completion.', admin: 'A future operations workspace for reviewing reports and coordinating pilot activity.' }
  if (title === 'Report an issue') return <div className="placeholder-page"><div className="eyebrow"><span className="eyebrow-line" />CITIZEN SPACE / PHASE 2</div><h1>Report an issue<span className="accent-dot">.</span></h1><p className="placeholder-lead">A preview of the information a future report could ask for. This form is disabled; entries are not sent or saved.</p><form className="report-preview-form"><label>What did you notice?<select disabled defaultValue=""><option value="" disabled>Select a category</option><option>Mixed waste</option><option>Overflowing bin</option><option>Construction debris</option><option>Other cleanliness concern</option></select></label><label>Where is it? <span>LOCATION SERVICES ARE NOT CONNECTED</span><input disabled placeholder="Location details" /></label><label>Add context<textarea disabled rows="4" placeholder="Describe what needs attention" /></label><label className="upload-placeholder">Photo (optional)<input disabled type="file" accept="image/*" /></label><button className="button button-primary" type="button" disabled>Submission comes in a future phase <Icon name="arrowRight" size={16} /></button><span className="form-note">DEMO ONLY · NO REPORT IS CREATED</span></form></div>
  return <div className="placeholder-page"><div className="eyebrow"><span className="eyebrow-line" />{area?.toUpperCase()} / PHASE 2</div><h1>{name}<span className="accent-dot">.</span></h1><p className="placeholder-lead">{summaries[area] || 'This part of the platform is being shaped as a clear foundation for future pilot operations.'}</p><section className="coming-panel"><div className="coming-icon"><Icon name="activity" size={22} /></div><div><span className="demo-label">FOUNDATION IN PROGRESS</span><h2>This space is a preview.</h2><p>Sign-in and role checks are connected. Live maps, report submission, task assignment, and operational actions are planned for later phases.</p><div className="placeholder-actions"><Button to="/how-it-works" variant="secondary" icon="arrowUpRight">Explore the concept</Button><Link to="/" className="text-link">Return to the homepage <Icon name="arrowRight" size={15} /></Link></div></div></section><div className="placeholder-foot"><span>SWACHHAI / NIT PATNA PILOT CONCEPT</span><span>NO LIVE OPERATIONAL DATA</span></div></div>
}

export function NotFoundPage() {
  return <div className="not-found"><div className="eyebrow"><span className="eyebrow-line" />404 / PAGE NOT FOUND</div><h1>We lost<br />the trail<span className="accent-dot">.</span></h1><p>The page you’re looking for isn’t here. Let’s get you back to the beginning.</p><Button to="/" icon="arrowRight">Back to home</Button></div>
}

export function ForbiddenPage() {
  const { user } = useAuth()
  return <div className="not-found"><div className="eyebrow"><span className="eyebrow-line" />403 / RESTRICTED AREA</div><h1>This space<br />is not yours<span className="accent-dot">.</span></h1><p>Your account does not have access to this workspace. The API also checks access for protected operations.</p><Button to={user ? dashboardPath(user.role) : '/'} icon="arrowRight">{user ? 'Back to your workspace' : 'Back to home'}</Button></div>
}
