import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, CheckCircle2, ClipboardList, MapPin, ShieldCheck } from 'lucide-react'
import { useAuth } from '../features/auth/AuthProvider.jsx'
import { dashboardPath } from '../features/auth/authService.js'

const workflow = [
  { icon: ClipboardList, title: 'Describe', text: 'Add a photo, short description, and location.' },
  { icon: MapPin, title: 'Review', text: 'An administrator checks the report and assigns work.' },
  { icon: CheckCircle2, title: 'Follow through', text: 'A worker records progress for administrator review.' },
]

export default function LandingPage() {
  const { user } = useAuth()
  const canReport = !user || user.role === 'citizen'
  const reportPath = user?.role === 'citizen' ? '/app/report' : user ? dashboardPath(user.role) : '/login'
  const reportLabel = canReport ? 'Report an issue' : 'Open workspace'
  const accountPath = user ? dashboardPath(user.role) : '/login'
  return <div className="minimal-home">
    <section className="home-hero container">
      <span className="page-kicker">SWACHHAI · NIT PATNA ACADEMIC PROJECT</span>
      <h1>Cleanliness reports,<br /><span>with a clear next step.</span></h1>
      <p>Share a local cleanliness concern, follow its review, and help coordinate the response.</p>
      <div className="home-hero-actions"><Link className="button button-primary" to={reportPath}>{reportLabel}<ArrowUpRight size={16} /></Link><Link className="button button-secondary" to={accountPath}>{user ? 'Account' : 'Sign in'}<ArrowRight size={15} /></Link></div>
      <div className="home-privacy-note"><ShieldCheck size={17} /><span>Reports are role-scoped. AI suggestions are optional and never submit a report for you.</span></div>
    </section>
    <section className="home-workflow"><div className="container"><header className="home-section-heading"><span className="page-kicker">HOW IT WORKS</span><h2>One straightforward workflow</h2><p>Each step has a clear owner, from the first report to the final review.</p></header><div className="home-workflow-grid">{workflow.map(({ icon: Icon, title, text }, index) => <article className="home-workflow-card" key={title}><span className="home-step-index">0{index + 1}</span><span className="home-workflow-icon"><Icon size={19} /></span><h3>{title}</h3><p>{text}</p></article>)}</div></div></section>
    <section className="home-zone-note" id="zones"><div className="container home-zone-inner"><div><span className="page-kicker">LOCATION-AWARE REPORTING</span><h2>Choose a place.<br />The app can suggest its zone.</h2><p>When an administrator configures approximate zone centers, a report’s GPS, map pin, or coordinates can select the nearest matching zone. Without a configured match, the citizen can choose one manually.</p></div><Link className="button button-secondary" to={accountPath}>Open SwachhAI<ArrowUpRight size={15} /></Link></div></section>
    <section className="home-cta container"><div><span className="page-kicker">READY WHEN YOU ARE</span><h2>Make a concern easier to follow.</h2></div><Link className="button button-primary" to={reportPath}>{canReport ? 'Start a report' : 'Open workspace'}<ArrowUpRight size={16} /></Link></section>
  </div>
}
