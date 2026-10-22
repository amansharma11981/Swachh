import { REPORT_STATUS_LABELS } from './reportService.js'

export default function ReportStatus({ status }) {
  return <span className={`report-status report-status-${status || 'unknown'}`}>{REPORT_STATUS_LABELS[status] || 'Status unavailable'}</span>
}
