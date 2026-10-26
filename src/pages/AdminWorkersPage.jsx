import { useEffect, useState } from 'react'
import { ArrowRight, RefreshCw, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { taskService } from '../features/tasks/taskService.js'

export default function AdminWorkersPage() {
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = async () => { setLoading(true); setError(''); try { const result = await taskService.adminWorkers(); setWorkers(result.items || []) } catch (requestError) { setError(requestError.message || 'Could not load active workers.') } finally { setLoading(false) } }
  useEffect(() => { load() }, [])
  return <section className="workspace-page workers-page"><header className="page-heading page-heading-row"><div><span className="page-kicker">OPERATIONS</span><h1>Workers</h1><p>Active workers and their current open assignments.</p></div><div className="heading-actions"><button className="button button-secondary" type="button" onClick={load} disabled={loading}><RefreshCw size={15} />Refresh</button><Link className="button button-primary" to="/admin/reports">Assign a task<ArrowRight size={15} /></Link></div></header>{error && <p role="alert" className="inline-error">{error}</p>}{loading ? <p className="loading-inline" role="status">Loading active workers…</p> : workers.length ? <div className="worker-directory">{workers.map((worker) => <article className="worker-card" key={worker.id}><span className="worker-card-icon"><Users size={18} /></span><div className="worker-card-info"><h2>{worker.name}</h2><p>{worker.email}</p></div><div className="worker-workload"><strong>{worker.activeTasks}</strong><span>open assignments</span></div><Link className="worker-card-link" to="/admin/reports" aria-label={`Assign task to ${worker.name}`}><ArrowRight size={18} /></Link></article>)}</div> : <div className="empty-state"><Users size={24} /><h2>No active workers yet</h2><p>Approve a worker request from Access requests. Approved workers will appear here.</p><Link to="/admin/access-requests">Review access requests<ArrowRight size={15} /></Link></div>}</section>
}
