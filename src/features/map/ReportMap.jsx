import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import './report-map.css'

const initialCenter = [Number(import.meta.env.VITE_MAP_CENTER_LAT) || 25.62, Number(import.meta.env.VITE_MAP_CENTER_LNG) || 85.17]
const colors = { urgent: '#d86a58', high: '#c88c58', normal: '#8191a1', low: '#707070' }

function markerIcon(report) {
  const symbol = report.priority === 'urgent' ? '!!' : report.priority === 'high' ? '!' : report.status === 'resolved' ? '✓' : '•'
  return L.divIcon({ className: 'report-map-pin-wrap', html: `<span class="report-map-pin" style="--pin-color:${colors[report.priority] || colors.normal}"><span>${symbol}</span></span>`, iconSize: [30, 36], iconAnchor: [15, 30] })
}

export default function ReportMap({ reports = [], hotspots = [], selectable = false, selectedPoint, onSelectPoint, height = 480 }) {
  const host = useRef(null); const mapRef = useRef(null); const groupRef = useRef(null)
  const selectedMarker = useRef(null)
  const hotspotLayer = useRef(null)
  const [tileError, setTileError] = useState(false)
  const callback = useRef(onSelectPoint); callback.current = onSelectPoint
  useEffect(() => {
    if (!host.current || host.current.clientWidth === 0) return
    const map = L.map(host.current, { scrollWheelZoom: false }).setView(initialCenter, 15)
    const tiles = L.tileLayer(import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>' })
    tiles.on('tileerror', () => setTileError(true)); tiles.on('tileload', () => setTileError(false)); tiles.addTo(map)
    map.on('click', (event) => { if (selectable) callback.current?.({ latitude: event.latlng.lat, longitude: event.latlng.lng }) })
    mapRef.current = map
    const resize = () => map.invalidateSize()
    window.addEventListener('resize', resize)
    return () => { window.removeEventListener('resize', resize); map.remove(); mapRef.current = null }
  }, [selectable])
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (groupRef.current) map.removeLayer(groupRef.current)
    const group = L.markerClusterGroup({ chunkedLoading: true, showCoverageOnHover: false, maxClusterRadius: 48 })
    for (const report of reports) {
      const coordinates = report.location?.point?.coordinates
      if (!Array.isArray(coordinates) || coordinates.length !== 2) continue
      const [longitude, latitude] = coordinates
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue
      const marker = L.marker([latitude, longitude], { icon: markerIcon(report), title: `${report.reportNumber}: ${report.category}` })
      const popup = document.createElement('div'); popup.className = 'report-map-popup'
      const title = document.createElement('strong'); title.textContent = report.reportNumber; popup.append(title)
      const category = document.createElement('span'); category.textContent = String(report.category || '').replaceAll('_', ' '); popup.append(category)
      const status = document.createElement('span'); status.textContent = `Status: ${String(report.status || '').replaceAll('_', ' ')}`; popup.append(status)
      const priority = document.createElement('span'); priority.textContent = `Priority: ${report.priority || 'normal'}`; popup.append(priority)
      const date = document.createElement('span'); date.textContent = `Reported: ${report.createdAt ? new Date(report.createdAt).toLocaleDateString() : 'date unavailable'}`; popup.append(date)
      if (report.zone) { const zone = document.createElement('span'); zone.textContent = `Zone: ${report.zone}`; popup.append(zone) }
      marker.bindPopup(popup); marker.addTo(group)
    }
    group.addTo(map); groupRef.current = group
    if (reports.length) { const bounds = group.getBounds(); if (bounds.isValid()) map.fitBounds(bounds.pad(.12), { maxZoom: 16 }) }
  }, [reports])
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (hotspotLayer.current) map.removeLayer(hotspotLayer.current)
    const layer = L.layerGroup()
    for (const cell of hotspots) {
      if (!Number.isFinite(cell.latitude) || !Number.isFinite(cell.longitude) || !Number.isFinite(cell.count)) continue
      L.circle([cell.latitude, cell.longitude], { radius: 110, color: '#d49a73', weight: 1, fillColor: '#d49a73', fillOpacity: .16 }).bindTooltip(`Recurring report area · ${cell.count} reports`).addTo(layer)
    }
    layer.addTo(map); hotspotLayer.current = layer
  }, [hotspots])
  const selected = useMemo(() => selectedPoint && Number.isFinite(Number(selectedPoint.latitude)) && Number.isFinite(Number(selectedPoint.longitude)) ? [Number(selectedPoint.latitude), Number(selectedPoint.longitude)] : null, [selectedPoint])
  useEffect(() => {
    const map = mapRef.current
    if (!map || !selectable) return
    if (selectedMarker.current) map.removeLayer(selectedMarker.current)
    selectedMarker.current = selected ? L.circleMarker(selected, { radius: 9, color: '#d7b399', fillColor: '#d7b399', fillOpacity: .9 }).addTo(map).bindPopup('Selected report location') : null
  }, [selected, selectable])
  return <div className="report-map-shell"><div className="report-map" ref={host} style={{ height }} role="application" aria-label={selectable ? 'Click map to select a report location' : 'Map of authorized report locations'} />{tileError && <p className="report-map-tile-error" role="status">Map tiles are temporarily unavailable. Check the connection or tile-provider settings.</p>}</div>
}
