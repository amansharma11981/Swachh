import { useCallback, useEffect, useState } from 'react'
import { Check, LoaderCircle, RefreshCw, ShieldCheck, UserRound, X } from 'lucide-react'
import { apiRequest } from '../services/apiClient.js'
import '../features/tasks/tasks.css'
import './admin-access-requests.css'

export default function AdminAccessRequestsPage() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await apiRequest('/users/approval-requests')
      setRequests(result.requests || [])
    } catch (requestError) {
      setError(requestError.message || 'Access requests could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const decide = async (user, decision) => {
    setBusyId(user.id)
    setError('')
    setNotice('')
    try {
      await apiRequest(`/users/${user.id}/approval`, { method: 'PATCH', body: { decision } })
      setNotice(`${user.name}'s ${user.requestedRole} request was ${decision === 'approve' ? 'approved' : 'rejected'}.`)
      await load()
    } catch (requestError) {
      setError(requestError.message || 'The access request could not be updated.')
    } finally {
      setBusyId('')
    }
  }

  return <section className="tasks-page access-requests-page">
    <header className="task-detail-heading"><div><span className="demo-label">ACCOUNT ACCESS</span><h1>Access requests</h1><p>Review requests for worker and administrator dashboards.</p></div><button className="access-refresh" type="button" onClick={load} disabled={loading}><RefreshCw size={15} />Refresh</button></header>
    {error && <p className="task-alert" role="alert">{error}</p>}
    {notice && <p className="task-notice" role="status">{notice}</p>}
    {loading ? <div className="report-loading" role="status"><LoaderCircle className="spin-icon" size={19} />Loading access requests…</div>
      : requests.length ? <div className="access-request-list">{requests.map((user) => <article className="access-request-card" key={user.id}>
        <div className="access-request-avatar">{user.requestedRole === 'admin' ? <ShieldCheck size={18} /> : <UserRound size={18} />}</div>
        <div className="access-request-info"><span className={`access-role access-role-${user.requestedRole}`}>{user.requestedRole} access</span><h2>{user.name}</h2><p>{user.email}</p><time dateTime={user.createdAt}>Requested {new Date(user.createdAt).toLocaleDateString()}</time></div>
        <div className="access-request-actions"><button type="button" onClick={() => decide(user, 'reject')} disabled={busyId === user.id}><X size={15} />Reject</button><button type="button" onClick={() => decide(user, 'approve')} disabled={busyId === user.id}>{busyId === user.id ? <LoaderCircle className="spin-icon" size={15} /> : <Check size={15} />}Approve</button></div>
      </article>)}</div>
      : !error && <div className="task-panel access-empty"><span className="demo-label">ALL CLEAR</span><h2>No pending requests</h2><p className="task-muted">New worker and administrator requests will appear here.</p></div>}
  </section>
}
