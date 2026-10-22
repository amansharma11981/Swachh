import { Link } from 'react-router-dom'
import { ArrowUpRight, MapPin } from 'lucide-react'
import { reportCategoryLabel, reportDate } from './reportService.js'
import ReportStatus from './ReportStatus.jsx'

export default function ReportCard({ report }) {
  return <article className="report-card">
    {report.images?.[0]?.secureUrl ? <img className="report-card-image" src={report.images[0].secureUrl} alt="Photo attached to report" loading="lazy" /> : <div className="report-card-image report-card-image-empty" aria-hidden="true">SW / REPORT</div>}
    <div className="report-card-content"><div className="report-card-top"><span className="report-number">{report.reportNumber}</span><ReportStatus status={report.status} /></div>
      <h3>{reportCategoryLabel(report.category)}</h3><p>{report.description}</p>
      <div className="report-card-meta"><span><MapPin size={14} />{report.location?.label || 'Location unavailable'}</span><time dateTime={report.createdAt}>{reportDate(report.createdAt, { dateStyle: 'medium' })}</time></div>
      <Link className="text-link" to={`/app/reports/${report.id || report._id}`}>View report <ArrowUpRight size={15} /></Link>
    </div>
  </article>
}
