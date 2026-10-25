import { useCallback, useEffect, useState } from 'react'
import { ArrowUpRight, Check, Clock3, History, LoaderCircle, RefreshCw, Search, ShieldCheck, UserRound, Users } from 'lucide-react'
import TaskStatus from '../features/tasks/TaskStatus.jsx'
import { taskDate, taskService, taskLabel } from '../features/tasks/taskService.js'
import '../features/tasks/tasks.css'

function dateInputValue(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) return ''
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}

export default function AdminTaskPage() {
  const [reports, setReports] = useState([])
  const [workers, setWorkers] = useState([])
  const [workerTotal, setWorkerTotal] = useState(0)
  const [pagination, setPagination] = useState(null)
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [forms, setForms] = useState({})
  const [histories, setHistories] = useState({})
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [attempt, setAttempt] = useState(0)
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [queue, workerList] = await Promise.all([taskService.adminQueue({ page, limit: 8, q: searchQuery }), taskService.adminWorkers({ limit: 50 })])
      setReports(queue.items); setPagination(queue.pagination); setWorkers(workerList.items); setWorkerTotal(workerList.pagination.total)
    } catch (requestError) { setError(requestError.message || 'The assignment queue could not be loaded.') }
    finally { setLoading(false) }
  }, [page, attempt, searchQuery])
  useEffect(() => { load() }, [load])
  const formFor = (report) => ({ workerId: String(report.assignedWorker || ''), priority: report.priority || 'normal', dueAt: dateInputValue(report.dueAt), reason: '', ...forms[report.id || report._id] })
  const updateForm = (id, key, value) => setForms((current) => ({ ...current, [id]: { ...current[id], [key]: value } }))
  const assign = async (event, report) => {
    event.preventDefault()
    const id = report.id || report._id; const values = formFor(report)
    if (!values.workerId) { setError('Choose a worker before assigning this report.'); return }
    const isReassignment = Boolean(report.assignedWorker && values.workerId !== String(report.assignedWorker))
    if (isReassignment && !values.reason.trim()) { setError('Add a reason before reassigning this task.'); return }
    if (isReassignment && !window.confirm('Reassign this task to the selected worker?')) return
    setBusyId(id); setError(''); setNotice('')
    try {
      await taskService.assign(id, { ...values, dueAt: values.dueAt ? new Date(values.dueAt).toISOString() : null })
      setNotice(`Task ${report.reportNumber} assigned successfully.`); await load()
    } catch (requestError) { setError(requestError.message || 'Assignment failed.') }
    finally { setBusyId('') }
  }
  const verify = async (report, approved) => {
    const id = report.id || report._id
    const message = approved ? `Approve ${report.reportNumber} and mark it completed?` : `Return ${report.reportNumber} for more work?`
    if (!window.confirm(message)) return
    const reason = forms[id]?.reason?.trim() || ''
    if (!approved && reason.length < 8) { setError('Add a reason of at least eight characters before returning work.'); return }
    setBusyId(id); setError(''); setNotice('')
    try { await taskService.verify(id, approved, reason); setNotice(approved ? 'Work approved and marked completed.' : 'Task returned to the worker.'); await load() }
    catch (requestError) { setError(requestError.message || 'Verification failed.') }
    finally { setBusyId('') }
  }
  const toggleHistory = async (report) => {
    const id = report.id || report._id
    if (histories[id]) { setHistories((current) => ({ ...current, [id]: null })); return }
    try { const result = await taskService.history(id); setHistories((current) => ({ ...current, [id]: result.history })) }
    catch (requestError) { setError(requestError.message || 'Assignment history could not be loaded.') }
  }

  return <section className="tasks-page admin-task-page">
    <div className="eyebrow"><span className="eyebrow-line" />OPERATIONS / FIELD ASSIGNMENTS</div>
    <div className="dashboard-heading"><div><h1>Task assignment<span className="lime-dot">.</span></h1><p>Route verified reports to the field team and review submitted work.</p></div><span className="worker-capacity"><Users size={16} />{workerTotal} active workers</span></div>
    {error && <div className="task-alert" role="alert"><span>{error}</span><button type="button" onClick={() => setAttempt((v) => v + 1)}><RefreshCw size={14} /> Try again</button></div>}{notice && <div className="task-notice" role="status"><Check size={16} />{notice}</div>}
    <div className="section-title-row task-section-heading"><div><span className="demo-label">DISPATCH + VERIFICATION</span><h2>Report queue</h2></div><span className="task-count">{pagination?.total ?? 0} reports</span></div>
    <form className="task-search" onSubmit={(event) => { event.preventDefault(); setPage(1); setSearchQuery(searchInput.trim()) }}><Search size={16} /><input aria-label="Search reports by report number" maxLength="80" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search by report number" /><button type="submit">Search</button>{searchQuery && <button type="button" className="task-search-clear" onClick={() => { setSearchInput(''); setSearchQuery(''); setPage(1) }}>Clear</button>}</form>
    {loading ? <div className="report-loading" role="status"><LoaderCircle className="spin-icon" size={19} />Loading assignment queue…</div> : reports.length ? <div className="admin-task-list">{reports.map((report) => {
      const id = report.id || report._id; const values = formFor(report); const needsVerification = report.status === 'submitted_for_verification'
      return <article className="admin-task-card" key={id}>
        <div className="admin-task-heading"><div><span className="task-reference">{report.reportNumber}</span><h3>{report.category?.replaceAll('_', ' ') || 'Cleanliness report'}</h3></div><TaskStatus status={report.status} /></div>
        <p className="admin-task-description">{report.description}</p><div className="task-card-meta"><span><UserRound size={14} />{report.reporterName || `Reporter ${String(report.reporter || '').slice(-6)}`}</span>{report.assignedWorker && <span>Assigned to {workers.find((worker) => worker.id === String(report.assignedWorker))?.name || 'inactive worker'}</span>}<span><Clock3 size={14} />{report.location?.label || 'Location not specified'}</span><span className={`task-priority task-priority-${report.priority}`}>{report.priority} priority</span></div>
        {report.images?.length > 0 && <div className="admin-evidence-strip">{report.images.map((image) => <a key={image.assetId} href={image.secureUrl} target="_blank" rel="noreferrer"><img src={image.secureUrl} alt="Citizen report evidence" /></a>)}</div>}
        {report.completionEvidence?.length > 0 && <div className="admin-evidence-strip"><span className="demo-label">WORKER COMPLETION EVIDENCE</span>{report.completionEvidence.map((image) => <a key={image.assetId} href={image.secureUrl} target="_blank" rel="noreferrer"><img src={image.secureUrl} alt="Worker completion evidence" /></a>)}</div>}
        {needsVerification ? <div className="admin-review"><div><ShieldCheck size={17} /><strong>Worker submitted this task for verification</strong></div><label htmlFor={`review-${id}`}>Review note <span>Required if returning work</span></label><textarea id={`review-${id}`} maxLength="500" value={values.reason} onChange={(event) => updateForm(id, 'reason', event.target.value)} placeholder="Describe any additional work needed" /><div className="admin-review-actions"><button className="task-button-muted" disabled={busyId === id} onClick={() => verify(report, false)} type="button">Return for further work</button><button disabled={busyId === id} onClick={() => verify(report, true)} type="button"><Check size={15} />Approve completion</button></div></div> : <form className="admin-assign-form" onSubmit={(event) => assign(event, report)}>
          <label>Assign to worker<select value={values.workerId} onChange={(event) => updateForm(id, 'workerId', event.target.value)} required><option value="">Select a worker</option>{workers.map((worker) => <option key={worker.id} value={worker.id}>{worker.name} · {worker.activeTasks} active</option>)}</select></label>
          <label>Priority<select value={values.priority} onChange={(event) => updateForm(id, 'priority', event.target.value)}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></label>
          <label>Due date<input type="datetime-local" value={values.dueAt} onChange={(event) => updateForm(id, 'dueAt', event.target.value)} /></label>
          {report.assignedWorker && values.workerId !== String(report.assignedWorker) && <label className="admin-reason-field">Reason for reassignment<input value={values.reason} maxLength="500" onChange={(event) => updateForm(id, 'reason', event.target.value)} placeholder="Explain why this task is moving" required /></label>}
          <button disabled={busyId === id || workers.length === 0} type="submit">{busyId === id ? <LoaderCircle className="spin-icon" size={15} /> : <ArrowUpRight size={15} />}{!report.assignedWorker ? 'Assign task' : values.workerId === String(report.assignedWorker) ? 'Update assignment' : 'Reassign task'}</button>
        </form>}
        <button className="task-history-toggle" onClick={() => toggleHistory(report)} type="button"><History size={15} />{histories[id] ? 'Hide' : 'View'} assignment history</button>
        {Array.isArray(histories[id]) && <ol className="task-history">{histories[id].length ? histories[id].map((entry, index) => <li key={`${entry.timestamp}-${index}`}><strong>{entry.action?.replaceAll('_', ' ')}</strong><span>{entry.note || taskLabel(entry.toStatus)} · by {entry.actorName}{entry.toWorkerName ? ` · worker ${entry.toWorkerName}` : ''}</span><time>{taskDate(entry.timestamp)}</time></li>) : <li>No assignment events recorded.</li>}</ol>}
      </article>
    })}</div> : !error ? <div className="report-empty"><span><Check size={22} /></span><h2>The queue is clear.</h2><p>New citizen reports will appear here for review and assignment.</p></div> : null}
    {!loading && pagination?.pages > 1 && <div className="report-pagination"><span>Page {pagination.page} of {pagination.pages}</span><div><button disabled={page <= 1} type="button" onClick={() => setPage((v) => v - 1)}>Previous</button><button disabled={page >= pagination.pages} type="button" onClick={() => setPage((v) => v + 1)}>Next</button></div></div>}
  </section>
}
