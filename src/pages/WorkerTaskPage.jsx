import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Camera, Check, Clock3, LoaderCircle, MapPin, MessageSquareText, RefreshCw, Send } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import TaskStatus from '../features/tasks/TaskStatus.jsx'
import { taskDate, taskService } from '../features/tasks/taskService.js'
import '../features/tasks/tasks.css'

export default function WorkerTaskPage() {
  const { id } = useParams()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [note, setNote] = useState('')
  const [attempt, setAttempt] = useState(0)
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setReport((await taskService.workerTask(id)).report) }
    catch (requestError) { setError(requestError.message || 'This task could not be loaded.') }
    finally { setLoading(false) }
  }, [id, attempt])
  useEffect(() => { load() }, [load])
  const run = async (action, message) => {
    setSaving(true); setError(''); setNotice('')
    try { const result = await action(); if (result?.report) setReport(result.report); setNotice(message); if (!result?.report) await load() }
    catch (requestError) { setError(requestError.message || 'The task could not be updated.') }
    finally { setSaving(false) }
  }
  const addNote = async (event) => { event.preventDefault(); const body = note.trim(); if (!body) return; await run(() => taskService.addNote(id, body), 'Progress note added.'); setNote('') }
  const uploadEvidence = async (event) => {
    event.preventDefault(); const formElement = event.currentTarget; const file = formElement.elements.image.files[0]
    if (!file) return
    const form = new FormData(); form.append('image', file)
    await run(() => taskService.addEvidence(id, form), 'Completion photo uploaded.'); formElement.reset()
  }
  const canWork = report && ['assigned', 'in_progress'].includes(report.status)
  const canSubmit = report?.status === 'in_progress' && report.completionEvidence?.length > 0
  const evidenceCheckpoint = [...(report?.assignmentHistory || [])].reverse().find((entry) => ['assigned', 'reassigned', 'returned'].includes(entry.action))
  const cycleEvidence = evidenceCheckpoint ? (report?.completionEvidence || []).filter((image) => new Date(image.uploadedAt).valueOf() > new Date(evidenceCheckpoint.timestamp).valueOf()).length : report?.completionEvidence?.length || 0

  if (loading) return <div className="report-loading" role="status"><LoaderCircle className="spin-icon" size={19} />Loading task…</div>
  if (!report) return <section className="tasks-page"><Link className="text-link" to="/worker/tasks"><ArrowLeft size={15} /> Back to tasks</Link><div className="task-alert" role="alert">{error || 'Task not found.'}<button type="button" onClick={() => setAttempt((value) => value + 1)}><RefreshCw size={14} /> Try again</button></div></section>

  return <section className="tasks-page worker-task-detail">
    <Link className="text-link" to="/worker/tasks"><ArrowLeft size={15} /> Back to tasks</Link>
    {error && <div className="task-alert" role="alert">{error}</div>}{notice && <div className="task-notice" role="status"><Check size={16} />{notice}</div>}
    <div className="task-detail-heading"><div><div className="eyebrow"><span className="eyebrow-line" />TASK / {report.reportNumber}</div><h1>{report.category?.replaceAll('_', ' ') || 'Cleanliness report'}<span className="accent-dot">.</span></h1><p>Review the report, record your progress, and submit completion evidence.</p></div><TaskStatus status={report.status} /></div>
    <div className="task-detail-layout">
      <div className="task-detail-main">
        <article className="task-panel"><div className="task-panel-title"><div><span className="demo-label">CITIZEN REPORT</span><h2>Issue details</h2></div><span className={`task-priority task-priority-${report.priority}`}>{report.priority} priority</span></div><p className="task-description">{report.description}</p><div className="task-detail-meta"><span><MapPin size={15} />{report.location?.label}</span><span><Clock3 size={15} />Reported {taskDate(report.createdAt)}</span></div>{report.images?.length > 0 && <div className="task-images">{report.images.map((image) => <a key={image.assetId} href={image.secureUrl} target="_blank" rel="noreferrer"><img src={image.secureUrl} alt="Citizen's report evidence" /></a>)}</div>}</article>
        <article className="task-panel"><div className="task-panel-title"><div><span className="demo-label">TASK TIMELINE</span><h2>Status history</h2></div><Clock3 size={19} /></div>{report.statusHistory?.length ? <ol className="task-notes">{report.statusHistory.map((entry, index) => <li key={`${entry.timestamp}-${index}`}><p><strong>{entry.fromStatus ? `${entry.fromStatus.replaceAll('_', ' ')} → ` : ''}{entry.toStatus.replaceAll('_', ' ')}</strong>{entry.note ? ` · ${entry.note}` : ''}</p><time>{taskDate(entry.timestamp)}</time></li>)}</ol> : <p className="task-muted">No status changes recorded yet.</p>}</article>
        <article className="task-panel"><div className="task-panel-title"><div><span className="demo-label">FIELD NOTES</span><h2>Progress updates</h2></div><MessageSquareText size={19} /></div>{report.progressNotes?.length ? <ol className="task-notes">{report.progressNotes.map((entry, index) => <li key={`${entry.createdAt}-${index}`}><p>{entry.body}</p><time>{taskDate(entry.createdAt)}</time></li>)}</ol> : <p className="task-muted">No progress notes yet.</p>}{canWork && <form className="task-inline-form" onSubmit={addNote}><label htmlFor="progress-note">Add a progress note</label><textarea id="progress-note" maxLength="500" value={note} onChange={(event) => setNote(event.target.value)} placeholder="What did you inspect or complete?" required /><button disabled={saving || !note.trim()} type="submit"><Send size={15} />Add note</button></form>}</article>
        <article className="task-panel"><div className="task-panel-title"><div><span className="demo-label">COMPLETION PROOF</span><h2>After-cleaning photos</h2></div><Camera size={19} /></div>{report.completionEvidence?.length ? <div className="task-images">{report.completionEvidence.map((image) => <a key={image.assetId} href={image.secureUrl} target="_blank" rel="noreferrer"><img src={image.secureUrl} alt="Worker completion evidence" /></a>)}</div> : <p className="task-muted">Upload at least one photo of the completed work before submitting it for review.</p>}{canWork && report.status === 'in_progress' && cycleEvidence < 3 && (report.completionEvidence?.length || 0) < 15 && <form className="task-inline-form" onSubmit={uploadEvidence}><label htmlFor="completion-image">Upload a completion photo <span>JPEG, PNG, or WebP · max 5 MB · up to three per work cycle</span></label><input id="completion-image" name="image" type="file" accept="image/jpeg,image/png,image/webp" required /><button disabled={saving} type="submit"><Camera size={15} />Upload photo</button></form>}</article>
      </div>
      <aside className="task-detail-aside"><article className="task-panel task-actions"><span className="demo-label">WORKFLOW</span><h2>Task actions</h2>{report.status === 'assigned' && <button disabled={saving} onClick={() => run(() => taskService.accept(id), 'Task accepted. Work is now in progress.')} type="button"><Check size={16} />Accept task</button>}{report.status === 'in_progress' && <button className="task-submit-button" disabled={saving || !canSubmit} onClick={() => run(() => taskService.submit(id), 'Submitted for administrator verification.')} type="button"><Send size={16} />Submit for verification</button>}{report.status === 'submitted_for_verification' && <p className="task-muted">Your work is with an administrator for verification.</p>}{report.status === 'resolved' && <p className="task-notice"><Check size={16} />Work approved on {taskDate(report.resolvedAt)}.</p>}{report.assignmentStatus === 'needs_work' && report.verificationNote && <p className="task-return-note"><strong>Further work requested:</strong> {report.verificationNote}</p>}{saving && <span className="task-saving" role="status"><LoaderCircle className="spin-icon" size={15} />Saving…</span>}</article><article className="task-panel"><span className="demo-label">ASSIGNMENT</span><dl className="task-facts"><div><dt>Assigned</dt><dd>{taskDate(report.assignedAt)}</dd></div><div><dt>Due</dt><dd>{taskDate(report.dueAt)}</dd></div><div><dt>Zone</dt><dd>{report.zone?.name || 'Not specified'}</dd></div><div><dt>Verification</dt><dd>{report.assignmentStatus?.replaceAll('_', ' ') || 'unassigned'}</dd></div></dl></article></aside>
    </div>
  </section>
}
