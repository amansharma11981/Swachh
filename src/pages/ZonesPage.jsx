import { useEffect, useState } from 'react'
import { MapPin } from 'lucide-react'
import { reportService } from '../features/reports/reportService.js'

export default function ZonesPage() {
  const [zones, setZones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => { let active = true; reportService.getZones().then((result) => { if (active) setZones(result.zones || []) }).catch((requestError) => { if (active) setError(requestError.message || 'Could not load pilot zones.') }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [])
  return <section className="workspace-page zones-page"><header className="page-heading"><span className="page-kicker">LOCAL COVERAGE</span><h1>Pilot zones</h1><p>Configured area labels used when a report location falls within a matching zone.</p></header>{error && <p role="alert" className="inline-error">{error}</p>}{loading ? <p className="loading-inline" role="status">Loading zones…</p> : zones.length ? <div className="zone-directory">{zones.map((zone) => <article className="zone-directory-card" key={zone.zoneId}><span className="zone-directory-icon"><MapPin size={19} /></span><div><h2>{zone.name}</h2><p>{zone.description || 'Pilot area label'}</p><span className="zone-directory-meta">{zone.geofence ? `Automatic matching within an approximate ${zone.geofence.radiusMeters} m radius.` : 'Manual zone selection until an administrator sets a center.'}</span></div><span className={`zone-state ${zone.boundaryVerified ? 'is-verified' : ''}`}>{zone.boundaryVerified ? 'Verified boundary' : 'Approximate area'}</span></article>)}</div> : <div className="empty-state"><MapPin size={24} /><h2>No zones are available</h2><p>Ask an administrator to configure the pilot zones.</p></div>}</section>
}
