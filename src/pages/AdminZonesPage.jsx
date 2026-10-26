import { useEffect, useMemo, useState } from 'react'
import { Check, Crosshair, LoaderCircle, MapPin, Save } from 'lucide-react'
import ReportMap from '../features/map/ReportMap.jsx'
import { reportService } from '../features/reports/reportService.js'

export default function AdminZonesPage() {
  const [zones, setZones] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [point, setPoint] = useState(null)
  const [radius, setRadius] = useState(500)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const selectedZone = zones.find((zone) => zone.zoneId === selectedId)
  const load = async () => {
    setLoading(true); setError('')
    try {
      const result = await reportService.getAdminZones()
      const items = result.zones || []
      setZones(items)
      setSelectedId((current) => items.some((zone) => zone.zoneId === current) ? current : items[0]?.zoneId || '')
    } catch (requestError) { setError(requestError.message || 'Could not load configured zones.') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])
  useEffect(() => {
    const fence = selectedZone?.geofence
    setPoint(fence ? { latitude: fence.latitude, longitude: fence.longitude } : null)
    setRadius(fence?.radiusMeters || 500)
  }, [selectedZone?.zoneId, selectedZone?.geofence?.latitude, selectedZone?.geofence?.longitude, selectedZone?.geofence?.radiusMeters])
  const selectedRadius = useMemo(() => Number(radius) || 0, [radius])
  const save = async () => {
    if (!selectedId || !point) return
    setSaving(true); setError(''); setNotice('')
    try {
      const result = await reportService.updateZoneGeofence(selectedId, { ...point, radiusMeters: selectedRadius })
      setZones((current) => current.map((zone) => zone.zoneId === selectedId ? result.zone : zone))
      setNotice('Approximate zone center and radius saved. New report locations can now suggest this zone.')
    } catch (requestError) { setError(requestError.message || 'Could not save the zone center.') }
    finally { setSaving(false) }
  }
  return <section className="workspace-page zones-page"><header className="page-heading"><span className="page-kicker">OPERATIONS</span><h1>Pilot zones</h1><p>Set an approximate center and service radius. New reports use the nearest matching zone.</p></header>{error && <p role="alert" className="inline-error">{error}</p>}{loading ? <p className="loading-inline" role="status">Loading pilot zones…</p> : zones.length ? <div className="zone-editor-layout"><div className="zone-editor-controls"><label>Zone to configure<select value={selectedId} onChange={(event) => { setSelectedId(event.target.value); setNotice('') }}>{zones.map((zone) => <option key={zone.zoneId} value={zone.zoneId}>{zone.name}</option>)}</select></label>{selectedZone && <div className="zone-geofence-status"><MapPin size={16} /><span>{selectedZone.geofence ? `Center saved · ${selectedZone.geofence.radiusMeters} m radius` : 'No center configured'}</span></div>}<div className="zone-radius-field"><label htmlFor="zone-radius">Approximate radius</label><div><input id="zone-radius" type="range" min="100" max="20000" step="50" value={radius} onChange={(event) => setRadius(Number(event.target.value))} /><input type="number" min="100" max="20000" step="50" value={radius} onChange={(event) => setRadius(Number(event.target.value))} aria-label="Radius in meters" /></div><small>100–20,000 metres. The map circle is only an automatic matching aid.</small></div><div className="zone-coordinate-box"><strong>Center point</strong><span>{point ? `${Number(point.latitude).toFixed(6)}, ${Number(point.longitude).toFixed(6)}` : 'Click the map to place a center'}</span></div><button className="button button-primary" type="button" onClick={save} disabled={!point || saving || selectedRadius < 100 || selectedRadius > 20000}>{saving ? <><LoaderCircle className="spin-icon" size={16} />Saving…</> : <><Save size={16} />Save zone center</>}</button>{notice && <p className="inline-success" role="status"><Check size={15} />{notice}</p>}<p className="settings-note">A center-radius circle is approximate. It does not mark a verified campus, municipal, or service boundary.</p></div><div className="zone-editor-map"><p><Crosshair size={15} />Click the map to set the center for <strong>{selectedZone?.name}</strong>.</p><ReportMap selectable selectedPoint={point} selectRadiusMeters={selectedRadius} onSelectPoint={(nextPoint) => { setPoint(nextPoint); setNotice('') }} height={490} /></div></div> : <div className="empty-state"><MapPin size={24} /><h2>No configured zones</h2><p>Active zone labels are managed with the backend REPORT_ZONES setting.</p></div>}</section>
}
