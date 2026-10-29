import { useEffect, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  MapPinned,
  RefreshCw,
  ShieldAlert,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { reportService, reportCategoryLabel, REPORT_CATEGORIES } from '../features/reports/reportService.js'
import { recommendationService } from '../features/recommendations/recommendationService.js'
import '../features/tasks/tasks.css'
import '../features/reports/analytics.css'
import '../features/recommendations/recommendations.css'

const metricsCards = [
  { key: 'total', label: 'All reports', Icon: Activity, variant: 'primary', desc: 'Total reported issues' },
  { key: 'pending', label: 'Pending review', Icon: Clock3, variant: 'warning', desc: 'Awaiting triage' },
  { key: 'inProgress', label: 'In progress', Icon: RefreshCw, variant: 'info', desc: 'Assigned / active in field' },
  { key: 'resolved', label: 'Resolved', Icon: CheckCircle2, variant: 'success', desc: 'Verified & closed' },
  { key: 'awaitingReview', label: 'Needs review', Icon: ShieldAlert, variant: 'purple', desc: 'Verification required' },
  { key: 'highPriorityOpen', label: 'High priority open', Icon: AlertTriangle, variant: 'danger', desc: 'Urgent unresolved' },
]

export default function AdminDashboardPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [insights, setInsights] = useState('')
  const [insightError, setInsightError] = useState('')
  const [insightLoading, setInsightLoading] = useState(false)
  const [audit, setAudit] = useState([])
  const [recommendationRuns, setRecommendationRuns] = useState([])
  const [recommendationLoading, setRecommendationLoading] = useState(false)
  const [recommendationBusyId, setRecommendationBusyId] = useState('')
  const [recommendationError, setRecommendationError] = useState('')
  const [outcomes, setOutcomes] = useState({})
  const [reviewValues, setReviewValues] = useState({})
  const [filters, setFilters] = useState({ from: '', to: '', status: '', category: '', priority: '', zoneId: '' })
  const [zones, setZones] = useState([])

  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }))
  const activeFilterCount = Object.values(filters).filter(Boolean).length

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    reportService.getAdminMetrics(filters)
      .then((value) => { if (active) setData(value) })
      .catch((e) => { if (active) setError(e.message || 'Could not load admin metrics.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [filters])

  useEffect(() => {
    let active = true
    reportService.getZones()
      .then((result) => { if (active) setZones(result.zones || []) })
      .catch(() => {})
    return () => { active = false }
  }, [])

  const maxCategory = Math.max(1, ...(data?.byCategory || []).map((item) => item.count))
  const maxDaily = Math.max(1, ...(data?.dailySubmissions || []).map((item) => item.count))
  const totalDaily = (data?.dailySubmissions || []).reduce((acc, curr) => acc + (curr.count || 0), 0)

  const generateInsights = async () => {
    setInsightLoading(true)
    setInsightError('')
    setInsights('')
    try {
      const result = await reportService.getAdminInsights(filters)
      setInsights(result.insights)
    } catch (e) {
      setInsightError(e.message || 'Could not generate insights.')
    } finally {
      setInsightLoading(false)
    }
  }

  const loadRecommendations = async () => {
    setRecommendationLoading(true)
    try {
      const result = await recommendationService.list()
      setRecommendationRuns(result.items || [])
    } catch (e) {
      setRecommendationError(e.message || 'Could not load recommendation history.')
    } finally {
      setRecommendationLoading(false)
    }
  }

  const generateRecommendations = async () => {
    setRecommendationBusyId('generate')
    setRecommendationError('')
    try {
      const result = await recommendationService.generate(filters)
      setRecommendationRuns((current) => [result.run, ...current].slice(0, 20))
    } catch (e) {
      setRecommendationError(e.message || 'Could not generate recommendations.')
    } finally {
      setRecommendationBusyId('')
    }
  }

  const reviewRecommendation = async (run) => {
    const values = reviewValues[run._id] || {}
    setRecommendationBusyId(run._id)
    setRecommendationError('')
    try {
      const updated = await recommendationService.review(run._id, {
        status: values.status || (run.status === 'new' ? 'reviewed' : run.status) || 'reviewed',
        feedback: values.feedback || '',
        actionTaken: values.actionTaken || '',
      })
      setRecommendationRuns((current) => current.map((item) => item._id === run._id ? updated.run : item))
    } catch (e) {
      setRecommendationError(e.message || 'Could not save recommendation review.')
    } finally {
      setRecommendationBusyId('')
    }
  }

  const loadOutcome = async (run) => {
    setRecommendationBusyId(`outcome-${run._id}`)
    try {
      const result = await recommendationService.outcome(run._id)
      setOutcomes((current) => ({ ...current, [run._id]: result }))
    } catch (e) {
      setRecommendationError(e.message || 'Outcome comparison is not available yet.')
    } finally {
      setRecommendationBusyId('')
    }
  }

  useEffect(() => {
    let active = true
    reportService.getRecentAudit()
      .then((result) => { if (active) setAudit(result.events || []) })
      .catch(() => { if (active) setAudit([]) })
    return () => { active = false }
  }, [])

  useEffect(() => { loadRecommendations() }, [])

  return (
    <section className="tasks-page admin-overview">
      <div className="eyebrow"><span className="eyebrow-line" />OPERATIONS / OVERVIEW</div>
      
      <div className="dashboard-heading">
        <div>
          <h1>Operations overview<span className="accent-dot">.</span></h1>
          <p>Live totals from submitted reports. Counts describe reports received by this pilot.</p>
        </div>
        <div className="dashboard-heading-actions">
          <Link className="text-link" to="/admin/map">
            <MapPinned size={15} />
            <span>Open report map</span>
          </Link>
          <Link to="/admin/reports" className="button button-secondary">
            Manage reports <ArrowUpRight size={15} />
          </Link>
        </div>
      </div>

      <div className="admin-date-filters-container">
        <div className="admin-date-filters">
          <div className="admin-filter-group">
            <label>
              <span className="filter-label-text">From</span>
              <input type="date" value={filters.from} onChange={(e) => setFilter('from', e.target.value)} />
            </label>
            <label>
              <span className="filter-label-text">To</span>
              <input type="date" value={filters.to} onChange={(e) => setFilter('to', e.target.value)} />
            </label>
            <label>
              <span className="filter-label-text">Status</span>
              <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
                <option value="">All statuses</option>
                {['submitted','under_review','assigned','in_progress','submitted_for_verification','resolved','rejected','duplicate','reopened'].map((v) => (
                  <option key={v} value={v}>{v.replaceAll('_', ' ')}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="filter-label-text">Category</span>
              <select value={filters.category} onChange={(e) => setFilter('category', e.target.value)}>
                <option value="">All categories</option>
                {REPORT_CATEGORIES.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="filter-label-text">Priority</span>
              <select value={filters.priority} onChange={(e) => setFilter('priority', e.target.value)}>
                <option value="">All priorities</option>
                {['low','normal','high','urgent'].map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="filter-label-text">Zone</span>
              <select value={filters.zoneId} onChange={(e) => setFilter('zoneId', e.target.value)}>
                <option value="">All zones</option>
                {zones.map((zone) => (
                  <option key={zone.zoneId} value={zone.zoneId}>{zone.name}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="admin-filter-actions">
            {activeFilterCount > 0 && (
              <button
                className="button button-secondary button-clear-filters"
                type="button"
                onClick={() => setFilters({ from: '', to: '', status: '', category: '', priority: '', zoneId: '' })}
              >
                <X size={14} /> Clear filters ({activeFilterCount})
              </button>
            )}
            <Link to="/admin/reports" className="button button-secondary">
              Manage reports <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
      </div>

      {error && <div className="task-alert" role="alert">{error}</div>}

      {loading ? (
        <div className="report-loading" role="status">Loading database metrics…</div>
      ) : data && (
        <>
          {/* 1. Operational Stat Blocks / Report Metric Cards */}
          <div className="admin-metric-grid">
            {metricsCards.map(({ key, label, Icon, variant, desc }) => {
              const count = data[key] ?? 0
              const percentage = data.total > 0 && key !== 'total' ? Math.round((count / data.total) * 100) : null
              return (
                <article className={`task-stat admin-stat-card admin-stat-${variant}`} key={key}>
                  <div className="admin-stat-header">
                    <span className="admin-stat-icon" aria-hidden="true">
                      <Icon size={18} />
                    </span>
                    {percentage !== null ? (
                      <span className="admin-stat-badge">{percentage}% of total</span>
                    ) : (
                      <span className="admin-stat-badge">Overall</span>
                    )}
                  </div>
                  <div className="admin-stat-body">
                    <strong className="admin-stat-value">{count}</strong>
                    <small className="admin-stat-label">{label}</small>
                    <span className="admin-stat-desc">{desc}</span>
                  </div>
                </article>
              )
            })}
          </div>

          {/* 2. Daily Report Volume Block */}
          <section className="admin-analytics-panel admin-daily-panel">
            <div className="section-title-row">
              <div>
                <span className="demo-label">RECORDED SUBMISSIONS · {data.dailyWindow}</span>
                <h2>Daily report volume</h2>
              </div>
              {data.dailySubmissions?.length > 0 && (
                <div className="admin-panel-stats-pill">
                  <span>Total: <strong>{totalDaily}</strong></span>
                  <span className="divider">·</span>
                  <span>Peak: <strong>{maxDaily}</strong>/day</span>
                </div>
              )}
            </div>

            {data.dailySubmissions?.length ? (
              <div className="admin-daily-chart-wrapper">
                <ul className="admin-bar-list admin-daily-bars">
                  {data.dailySubmissions.map(({ _id, count }) => {
                    const dateObj = new Date(`${_id}T12:00:00`)
                    const formattedDate = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                    const percentage = Math.max(3, Math.round((count / maxDaily) * 100))
                    return (
                      <li key={_id} className="admin-daily-bar-item" title={`${formattedDate}: ${count} reports`}>
                        <div className="admin-daily-bar-header">
                          <span className="admin-daily-date">{formattedDate}</span>
                          <strong className="admin-daily-count">{count}</strong>
                        </div>
                        <span className="admin-bar-track">
                          <i style={{ width: `${percentage}%` }} />
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ) : (
              <p className="admin-empty-panel-msg">No reports were submitted in this window.</p>
            )}
          </section>

          {/* 3. Analytics Grid: Reports by Category & Reports by Zone */}
          <div className="admin-analytics-grid">
            <section className="admin-analytics-panel">
              <div className="section-title-row">
                <div>
                  <span className="demo-label">OBSERVED RECORDS</span>
                  <h2>Reports by category</h2>
                </div>
                <span className="admin-panel-badge">{data.byCategory?.length || 0} categories</span>
              </div>
              {data.byCategory?.length ? (
                <ul className="admin-bar-list">
                  {data.byCategory.map(({ _id, count }) => {
                    const share = data.total > 0 ? Math.round((count / data.total) * 100) : 0
                    const pct = Math.max(3, Math.round((count / maxCategory) * 100))
                    return (
                      <li key={_id} className="admin-bar-list-item">
                        <div className="admin-bar-row">
                          <span className="admin-bar-label">{reportCategoryLabel(_id)}</span>
                          <div className="admin-bar-metrics">
                            <strong>{count}</strong>
                            <span className="admin-bar-pct">{share}%</span>
                          </div>
                        </div>
                        <span className="admin-bar-track">
                          <i style={{ width: `${pct}%` }} />
                        </span>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="admin-empty-panel-msg">No reports match this period.</p>
              )}
            </section>

            <section className="admin-analytics-panel">
              <div className="section-title-row">
                <div>
                  <span className="demo-label">PILOT LABELS</span>
                  <h2>Reports by zone</h2>
                </div>
                <span className="admin-panel-badge">{data.byZone?.length || 0} zones</span>
              </div>
              {data.byZone?.length ? (
                <ul className="admin-zone-list">
                  {data.byZone.map(({ _id, count }, index) => {
                    const share = data.total > 0 ? Math.round((count / data.total) * 100) : 0
                    return (
                      <li key={_id} className="admin-zone-item">
                        <div className="admin-zone-main">
                          <span className="admin-zone-rank">#{index + 1}</span>
                          <span className="admin-zone-name">{_id}</span>
                        </div>
                        <div className="admin-zone-metrics">
                          <strong>{count}</strong>
                          <span className="admin-zone-pct">{share}%</span>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="admin-empty-panel-msg">No zone reports in this period.</p>
              )}
              <div className="admin-panel-footer">
                <div className="admin-stat-chip">
                  <Clock3 size={14} />
                  <span>Average resolution: {data.averageResolutionMs == null ? 'insufficient resolved timestamps' : `${Math.round(data.averageResolutionMs / 3600000)} hours`}.</span>
                </div>
                <p className="admin-method-note">Counts reflect reports in the selected submission date range. They are not an estimate of total waste.</p>
              </div>
            </section>
          </div>

          {/* 4. Recent Administrative Activity Block */}
          <section className="admin-analytics-panel admin-audit-overview">
            <div className="section-title-row">
              <div>
                <span className="demo-label">APPEND-ONLY EVENT RECORDS</span>
                <h2>Recent administrative activity</h2>
              </div>
              <span className="admin-panel-badge">{audit.length} events</span>
            </div>
            {audit.length ? (
              <ul className="admin-audit-list">
                {audit.slice(0, 8).map((event) => (
                  <li key={event._id} className="admin-audit-item">
                    <div className="admin-audit-header">
                      <span className="admin-audit-action">{event.action?.replaceAll('_', ' ')}</span>
                      <span className="admin-audit-target">· {event.targetType} {String(event.targetId).slice(-7)}</span>
                      <time className="admin-audit-time">
                        {event.createdAt ? new Date(event.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Time unavailable'}
                      </time>
                    </div>
                    {event.changes && Object.keys(event.changes).length > 0 && (
                      <code className="admin-audit-code">{JSON.stringify(event.changes || {})}</code>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="admin-empty-panel-msg">No administrative audit events are recorded yet.</p>
            )}
          </section>

          {/* 5. AI Operations Notes Block */}
          <section className="admin-analytics-panel admin-insights-panel">
            <div className="section-title-row">
              <div>
                <span className="demo-label">AGGREGATE DATA ONLY</span>
                <h2>AI operations notes</h2>
              </div>
              <button className="button button-secondary" type="button" disabled={insightLoading} onClick={generateInsights}>
                {insightLoading ? 'Generating…' : 'Generate insights'}
              </button>
            </div>
            <p className="admin-method-note">Groq receives filtered counts by status, category, and zone. Report descriptions, images, and user identities are excluded. Suggestions are advisory.</p>
            {insightError && <p className="task-alert" role="alert">{insightError}</p>}
            {insights && <p className="admin-ai-insight" aria-live="polite">{insights}</p>}
          </section>

          {/* 6. Cleanliness Recommendations Block */}
          <section className="admin-analytics-panel recommendation-panel" aria-labelledby="recommendation-title">
            <div className="section-title-row">
              <div>
                <span className="demo-label">EVIDENCE-BASED · HUMAN REVIEW REQUIRED</span>
                <h2 id="recommendation-title">Cleanliness recommendations</h2>
              </div>
              <button className="button button-secondary" type="button" disabled={recommendationBusyId === 'generate'} onClick={generateRecommendations}>
                {recommendationBusyId === 'generate' ? 'Generating…' : 'Generate recommendations'}
              </button>
            </div>
            <p className="recommendation-panel-intro">The backend calculates report counts first. Groq receives only period labels and aggregated counts. Recommendations never modify reports or their official priorities.</p>
            {recommendationError && <p className="recommendation-error" role="alert">{recommendationError}</p>}
            {recommendationLoading ? (
              <div className="report-loading" role="status">Loading recommendation history…</div>
            ) : recommendationRuns.length ? (
              <div className="recommendation-run-list">
                {recommendationRuns.map((run) => (
                  <article className="recommendation-run" key={run._id}>
                    <div className="recommendation-run-head">
                      <div>
                        <h3>Recommendation run</h3>
                        <p className="recommendation-run-meta">{new Date(run.period?.start).toLocaleDateString()} – {new Date(run.period?.end).toLocaleDateString()} · generated {new Date(run.createdAt).toLocaleString()}</p>
                        <p className="recommendation-run-meta">Based on {run.evidence?.total ?? 0} reports · {run.status?.replaceAll('_', ' ')}</p>
                      </div>
                      <span className="recommendation-period-label">{run.model === 'not_called_insufficient_data' ? 'AI not called: insufficient dataset' : `Model: ${run.model}`}</span>
                    </div>
                    {!run.evidence?.sufficientEvidence ? (
                      <p className="recommendation-insufficient">Insufficient evidence for AI recommendations in this period (fewer than three reports). Standard dashboard metrics remain available.</p>
                    ) : run.recommendations?.length ? (
                      <div className="recommendation-list">
                        {run.recommendations.map((item) => (
                          <section className="recommendation-card" key={item._id}>
                            <h4>{item.title}</h4>
                            <p><strong>Observed:</strong> {item.observation}</p>
                            <p><strong>Interpretation (hypothesis):</strong> {item.interpretation}</p>
                            <p><strong>Suggested action:</strong> {item.suggestedAction}</p>
                            <p><strong>Limitation:</strong> {item.limitation}</p>
                            <span className="recommendation-priority">Review priority · {item.priority}</span>
                            <div className="recommendation-evidence">
                              {item.evidence?.map((evidence) => (
                                <span key={evidence.key}>{evidence.label}: <strong>{evidence.value}</strong></span>
                              ))}
                            </div>
                          </section>
                        ))}
                      </div>
                    ) : (
                      <p className="recommendation-insufficient">No supported recommendation was generated. Review the attached aggregate evidence and standard analytics.</p>
                    )}
                    <form className="recommendation-review-form" onSubmit={(event) => { event.preventDefault(); reviewRecommendation(run) }}>
                      <label>Review status
                        <select value={reviewValues[run._id]?.status ?? (run.status === 'new' ? 'reviewed' : run.status) ?? 'reviewed'} onChange={(e) => setReviewValues((all) => ({ ...all, [run._id]: { ...all[run._id], status: e.target.value } }))}>
                          {['reviewed','accepted','rejected','action_required','completed'].map((status) => (
                            <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>
                          ))}
                        </select>
                      </label>
                      <label>Feedback (optional)
                        <input value={reviewValues[run._id]?.feedback ?? run.feedback ?? ''} maxLength={1000} onChange={(e) => setReviewValues((all) => ({ ...all, [run._id]: { ...all[run._id], feedback: e.target.value } }))} placeholder="Reason for the review decision" />
                      </label>
                      <label>Action taken (optional)
                        <input value={reviewValues[run._id]?.actionTaken ?? run.actionTaken ?? ''} maxLength={500} onChange={(e) => setReviewValues((all) => ({ ...all, [run._id]: { ...all[run._id], actionTaken: e.target.value } }))} placeholder="Describe the action; no causal claim" />
                      </label>
                      <button type="submit" disabled={recommendationBusyId === run._id}>
                        {recommendationBusyId === run._id ? 'Saving…' : 'Save review'}
                      </button>
                    </form>
                    {run.actionTakenAt && (
                      <div className="recommendation-run-actions">
                        <button type="button" disabled={recommendationBusyId === `outcome-${run._id}`} onClick={() => loadOutcome(run)}>
                          Compare report counts after action
                        </button>
                      </div>
                    )}
                    {outcomes[run._id] && (
                      <p className="recommendation-outcome" aria-live="polite">
                        <strong>Observed count change:</strong> {outcomes[run._id].baseline.reportCount} baseline reports → {outcomes[run._id].followup.reportCount} follow-up reports. {outcomes[run._id].interpretation}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <p>{recommendationError ? '' : 'No recommendation runs yet. Generate one to save an evidence snapshot and start an administrator review.'}</p>
            )}
          </section>
        </>
      )}
    </section>
  )
}
