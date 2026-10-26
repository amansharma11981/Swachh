import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, LoaderCircle, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import Button from '../components/ui/Button.jsx'
import ReportCard from '../features/reports/ReportCard.jsx'
import { reportService } from '../features/reports/reportService.js'

const filters = [
  ['all', 'All reports', undefined], ['submitted', 'Submitted', 'submitted'],
  ['under_review', 'Under review', 'under_review'], ['in_progress', 'In progress', 'in_progress'], ['resolved', 'Resolved', 'resolved'],
]

export default function MyReportsPage() {
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true); setError('')
    const status = filters.find(([key]) => key === filter)?.[2]
    reportService.getMyReports({ page, limit: 10, status }).then((response) => { if (active) setResult(response) }).catch((requestError) => { if (active) setError(requestError.message || 'Your reports could not be loaded.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [filter, page, retry])

  const changeFilter = (key) => { setFilter(key); setPage(1) }
  const reports = result?.items || []
  const pagination = result?.pagination

  return <div className="my-reports-page">
    <div className="eyebrow"><span className="eyebrow-line" />CITIZEN SPACE / REPORT HISTORY</div>
    <div className="dashboard-heading"><div><h1>My reports<span className="accent-dot">.</span></h1><p>Reports you have submitted and their latest recorded status.</p></div><Button to="/app/report" icon="arrowUpRight">New report</Button></div>
    <div className="report-filters" role="tablist" aria-label="Filter reports by status">{filters.map(([key, label]) => <button key={key} type="button" role="tab" aria-selected={filter === key} className={filter === key ? 'active' : ''} onClick={() => changeFilter(key)}>{label}</button>)}</div>
    {error && <div className="report-form-alert" role="alert"><span>{error}</span><button className="text-link" type="button" onClick={() => setRetry((value) => value + 1)}><RefreshCw size={14} />Try again</button></div>}
    {loading ? <div className="report-loading" role="status"><LoaderCircle className="spin-icon" size={19} />Loading your reports…</div> : reports.length ? <><div className="report-card-list">{reports.map((report) => <ReportCard key={report.id || report._id} report={report} />)}</div><nav className="report-pagination" aria-label="Report pages"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ArrowLeft size={15} />Previous</button><span>Page {pagination?.page || page} of {Math.max(pagination?.pages || 1, 1)}</span><button type="button" disabled={page >= (pagination?.pages || 1)} onClick={() => setPage((value) => value + 1)}>Next <ArrowRight size={15} /></button></nav></> : !error && <div className="report-empty"><span><RefreshCw size={20} /></span><h2>No reports in this view.</h2><p>{filter === 'all' ? 'Reports you submit will appear here with their current status.' : 'Try another status filter or submit a new report.'}</p><div className="report-empty-actions"><Button to="/app/report" icon="arrowUpRight">Create a report</Button><Link className="text-link" to="/app">Back to overview</Link></div></div>}
  </div>
}
