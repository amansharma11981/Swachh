import { useCallback, useEffect, useState } from 'react'
import { ArrowUpRight, ClipboardList, LoaderCircle, RefreshCw, Send, Timer, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import Button from '../components/ui/Button.jsx'
import ReportCard from '../features/reports/ReportCard.jsx'
import { reportService } from '../features/reports/reportService.js'

const statItems = [
  ['total', 'Reports submitted', ClipboardList],
  ['awaitingReview', 'Awaiting review', Timer],
  ['inProgress', 'In progress', Send],
  ['resolved', 'Resolved', CheckCircle2],
]

export default function CitizenDashboardPage() {
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setDashboard(await reportService.getDashboard()) }
    catch (requestError) { setError(requestError.message || 'Your report summary could not be loaded.') }
    finally { setLoading(false) }
  }, [attempt])
  useEffect(() => { load() }, [load])

  return <div className="citizen-dashboard">
    <div className="eyebrow"><span className="eyebrow-line" />CITIZEN SPACE / YOUR ACTIVITY</div>
    <div className="dashboard-heading"><div><h1>Your reports<span className="accent-dot">.</span></h1><p>Follow the reports you have shared with the pilot team.</p></div><Button to="/app/report" icon="arrowUpRight">Report an issue</Button></div>
    {error && <div className="report-form-alert" role="alert"><span>{error}</span><button className="text-link" onClick={() => setAttempt((value) => value + 1)} type="button"><RefreshCw size={14} />Try again</button></div>}
    <div className="dashboard-stats" aria-label="Your report summary">{statItems.map(([key, label, Icon]) => <article className="dashboard-stat" key={key}><span className="dashboard-stat-icon"><Icon size={17} /></span><span>{label}</span><strong>{loading ? '—' : dashboard?.stats?.[key] ?? '—'}</strong></article>)}</div>
    <div className="section-title-row"><div><span className="demo-label">LATEST UPDATES</span><h2>Recent reports</h2></div><Link className="text-link" to="/app/reports">All reports <ArrowUpRight size={15} /></Link></div>
    {loading ? <div className="report-loading" role="status"><LoaderCircle className="spin-icon" size={19} />Loading your reports…</div> : dashboard?.recent?.length ? <div className="report-card-list">{dashboard.recent.map((report) => <ReportCard key={report.id || report._id} report={report} />)}</div> : !error ? <div className="report-empty"><span><ClipboardList size={22} /></span><h2>Your report history starts here.</h2><p>When you notice a cleanliness issue, share a photo and location so the pilot team can review it.</p><Button to="/app/report" icon="arrowUpRight">Submit your first report</Button></div> : null}
  </div>
}
