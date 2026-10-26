import { useCallback, useEffect, useState } from 'react'
import { Activity, CheckCircle2, ClipboardList, LoaderCircle, RefreshCw, Search, Timer } from 'lucide-react'
import Button from '../components/ui/Button.jsx'
import TaskCard from '../features/tasks/TaskCard.jsx'
import { taskService } from '../features/tasks/taskService.js'
import '../features/tasks/tasks.css'

const stats = [['assigned', 'New assignments', ClipboardList], ['inProgress', 'In progress', Activity], ['awaitingVerification', 'Awaiting review', Timer], ['completed', 'Completed', CheckCircle2]]

export default function WorkerDashboardPage() {
  const [dashboard, setDashboard] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('active')
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [summary, result] = await Promise.all([taskService.workerDashboard(), taskService.workerTasks({ page, limit: 8, status, q: searchQuery })])
      setDashboard(summary); setTasks(result.items); setPagination(result.pagination)
    } catch (requestError) { setError(requestError.message || 'Your tasks could not be loaded.') }
    finally { setLoading(false) }
  }, [page, status, searchQuery, attempt])
  useEffect(() => { load() }, [load])
  const changeStatus = (value) => { setStatus(value); setPage(1) }

  return <section className="tasks-page">
    <div className="eyebrow"><span className="eyebrow-line" />FIELD TEAM / MY WORK</div>
    <div className="dashboard-heading"><div><h1>Worker dashboard<span className="accent-dot">.</span></h1><p>Your assigned work, progress, and completed tasks in one place.</p></div><Button to="/worker/tasks" icon="arrowUpRight">View all tasks</Button></div>
    {error && <div className="task-alert" role="alert"><span>{error}</span><button type="button" onClick={() => setAttempt((v) => v + 1)}><RefreshCw size={14} /> Try again</button></div>}
    <div className="task-stats" aria-label="Your task summary">{stats.map(([key, label, Icon]) => <article className="task-stat" key={key}><span><Icon size={17} /></span><div><small>{label}</small><strong>{loading ? '—' : dashboard?.stats?.[key] ?? 0}</strong></div></article>)}</div>
    <div className="section-title-row task-section-heading"><div><span className="demo-label">YOUR QUEUE</span><h2>Tasks to work on</h2></div><span className="task-count">{pagination?.total ?? 0} tasks</span></div>
    <div className="task-filters" role="group" aria-label="Filter tasks">{[['active', 'Active'], ['assigned', 'New'], ['in_progress', 'In progress'], ['submitted_for_verification', 'Awaiting review'], ['completed', 'Completed']].map(([key, label]) => <button className={status === key ? 'active' : ''} key={key} onClick={() => changeStatus(key)} type="button">{label}</button>)}</div>
    <form className="task-search" onSubmit={(event) => { event.preventDefault(); setPage(1); setSearchQuery(searchInput.trim()) }}><Search size={16} /><input aria-label="Search tasks by report number" maxLength="80" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search by report number" /><button type="submit">Search</button>{searchQuery && <button type="button" className="task-search-clear" onClick={() => { setSearchInput(''); setSearchQuery(''); setPage(1) }}>Clear</button>}</form>
    {loading ? <div className="report-loading" role="status"><LoaderCircle className="spin-icon" size={19} />Loading assigned tasks…</div> : tasks.length ? <div className="task-list">{tasks.map((task) => <TaskCard key={task.id || task._id} task={task} />)}</div> : !error ? <div className="report-empty"><span><ClipboardList size={22} /></span><h2>No tasks in this view.</h2><p>New assignments and task updates will appear here.</p></div> : null}
    {!loading && pagination?.pages > 1 && <div className="report-pagination"><span>Page {pagination.page} of {pagination.pages}</span><div><button disabled={page <= 1} type="button" onClick={() => setPage((v) => v - 1)}>Previous</button><button disabled={page >= pagination.pages} type="button" onClick={() => setPage((v) => v + 1)}>Next</button></div></div>}
  </section>
}
