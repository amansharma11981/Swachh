import { useEffect, useState } from 'react'
import { ArrowLeft, LoaderCircle, MapPin, RefreshCw } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import ReportStatus from '../features/reports/ReportStatus.jsx'
import { reportCategoryLabel, reportDate, reportService } from '../features/reports/reportService.js'

export default function ReportDetailPage() {
  const { id } = useParams()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true); setError('')
    reportService.getReport(id).then(({ report: result }) => { if (active) setReport(result) }).catch((requestError) => { if (active) setError(requestError.message || 'This report could not be loaded.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id, retry])

  if (loading) return <div className="report-loading" role="status"><LoaderCircle className="spin-icon" size={19} />Loading report details…</div>
  if (error) return <div className="report-detail-page"><Link to="/app/reports" className="text-link"><ArrowLeft size={15} />My reports</Link><div className="report-empty report-detail-error"><span><MapPin size={20} /></span><h1>Report unavailable<span className="lime-dot">.</span></h1><p>{error.includes('not found') ? 'This report does not exist or is not available to your account.' : error}</p><button className="text-link" type="button" onClick={() => setRetry((value) => value + 1)}><RefreshCw size={14} />Try again</button></div></div>

  return <div className="report-detail-page">
    <Link to="/app/reports" className="text-link"><ArrowLeft size={15} />Back to my reports</Link>
    <div className="report-detail-heading"><div><div className="eyebrow"><span className="eyebrow-line" />REPORT TRACKING</div><h1>{report.reportNumber}<span className="lime-dot">.</span></h1><p>{reportCategoryLabel(report.category)} · submitted {reportDate(report.createdAt)}</p></div><ReportStatus status={report.status} /></div>
    <div className="report-detail-grid"><div className="report-detail-main">
      <section className="report-detail-panel"><span className="demo-label">PHOTO EVIDENCE</span><div className="report-detail-images">{report.images?.map((image) => <img key={image.assetId} src={image.secureUrl} alt={`Photo attached to ${report.reportNumber}`} />)}</div></section>
      <section className="report-detail-panel"><span className="demo-label">WHAT WAS REPORTED</span><h2>{reportCategoryLabel(report.category)}</h2><p className="report-detail-description">{report.description}</p></section>
      <section className="report-detail-panel"><span className="demo-label">STATUS HISTORY</span><ol className="status-timeline">{(report.statusHistory || []).map((entry, index) => <li key={`${entry.toStatus}-${entry.timestamp}-${index}`}><span className="timeline-marker" /><div><div className="timeline-entry-heading"><strong>{entry.toStatus?.replaceAll('_', ' ')}</strong><time dateTime={entry.timestamp}>{reportDate(entry.timestamp)}</time></div>{entry.note && <p>{entry.note}</p>}</div></li>)}</ol>{!report.statusHistory?.length && <p className="field-hint">No status updates are available.</p>}</section>
    </div><aside className="report-detail-aside">
      <section className="report-detail-panel"><span className="demo-label">LOCATION</span><h2><MapPin size={16} />{report.location?.label || 'Location unavailable'}</h2>{report.location?.point?.coordinates && <p className="coordinate-summary">{report.location.point.coordinates[1].toFixed(5)}, {report.location.point.coordinates[0].toFixed(5)} · {report.location.source === 'gps' ? 'browser location, not independently verified' : 'coordinates entered manually'}</p>}{report.zone && <p className="zone-summary">Pilot zone: {report.zone.name}{report.zone.boundaryVerified ? '' : ' · provisional label, boundary not verified'}</p>}</section>
      <section className="report-detail-panel"><span className="demo-label">SUBMISSION</span><dl className="detail-dl"><div><dt>Report ID</dt><dd>{report.reportNumber}</dd></div><div><dt>Submitted</dt><dd>{reportDate(report.createdAt)}</dd></div><div><dt>Priority</dt><dd>{report.priority === 'normal' ? 'Normal' : 'Unavailable'}</dd></div>{report.resolvedAt && <div><dt>Resolved</dt><dd>{reportDate(report.resolvedAt)}</dd></div>}</dl></section>
    </aside></div>
  </div>
}
