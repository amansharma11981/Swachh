import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, ArrowUpRight, CheckCircle2, ImagePlus, LoaderCircle, MapPin, Navigation2, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import Button from '../components/ui/Button.jsx'
import { REPORT_CATEGORIES, reportService } from '../features/reports/reportService.js'

const maximumImageBytes = Number(import.meta.env.VITE_REPORT_MAX_IMAGE_SIZE_BYTES) || 5 * 1024 * 1024
const supportedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
const formatBytes = (value) => `${(value / (1024 * 1024)).toFixed(value >= 1024 * 1024 ? 1 : 2)} MB`

export default function ReportFormPage() {
  const [form, setForm] = useState({ category: '', description: '', locationLabel: '', latitude: '', longitude: '', source: 'manual', zoneId: '' })
  const [image, setImage] = useState(null)
  const [imageError, setImageError] = useState('')
  const [zones, setZones] = useState([])
  const [storageConfigured, setStorageConfigured] = useState(null)
  const [zoneNotice, setZoneNotice] = useState('')
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [pending, setPending] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [createdReport, setCreatedReport] = useState(null)
  const locationRequestId = useRef(0)
  const previewUrl = useMemo(() => image ? URL.createObjectURL(image) : '', [image])

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])
  useEffect(() => {
    let active = true
    reportService.getZones().then(({ zones: available, imageUploadEnabled }) => { if (active) { setZones(available || []); setStorageConfigured(Boolean(imageUploadEnabled)) } }).catch(() => { if (active) setZoneNotice('Pilot zones are temporarily unavailable. You can still submit without selecting one.') })
    return () => { active = false }
  }, [])

  const setField = (key) => (event) => {
    const value = event.target.value
    if (['locationLabel', 'latitude', 'longitude'].includes(key)) { locationRequestId.current += 1; setLocating(false) }
    setForm((current) => ({ ...current, [key]: value, ...(['locationLabel', 'latitude', 'longitude'].includes(key) ? { source: 'manual' } : {}) }))
    setFieldErrors((current) => ({ ...current, [key]: '' }))
    setError('')
  }

  const chooseImage = (file) => {
    setImageError('')
    setFieldErrors((current) => ({ ...current, image: '' }))
    if (!file) { setImage(null); return }
    if (!supportedMimeTypes.has(file.type)) { setImage(null); setImageError('Choose a JPEG, PNG, or WebP image.'); return }
    if (file.size > maximumImageBytes) { setImage(null); setImageError(`Image must be ${formatBytes(maximumImageBytes)} or smaller.`); return }
    setImage(file)
  }

  const useCurrentLocation = () => {
    setLocationError('')
    if (!navigator.geolocation) { setLocationError('This browser does not provide location access. Enter the location manually.'); return }
    const requestId = ++locationRequestId.current
    setLocating(true)
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      if (requestId !== locationRequestId.current) return
      const latitude = coords.latitude.toFixed(6)
      const longitude = coords.longitude.toFixed(6)
      setForm((current) => ({ ...current, latitude, longitude, source: 'gps', locationLabel: `Current location (${latitude}, ${longitude})` }))
      setFieldErrors((current) => ({ ...current, locationLabel: '', latitude: '', longitude: '' }))
      setLocationError('')
      setLocating(false)
    }, (geoError) => {
      if (requestId !== locationRequestId.current) return
      const messages = { 1: 'Location permission was denied. Enter the place and, if known, its coordinates manually.', 2: 'Your position is unavailable. Enter the location manually.', 3: 'Location request timed out. Try again or enter the location manually.' }
      setLocationError(messages[geoError.code] || 'Could not get your location. Enter it manually.')
      setLocating(false)
    }, { enableHighAccuracy: false, timeout: 12_000, maximumAge: 60_000 })
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!image) { setImageError('Choose one image to attach to your report.'); return }
    setError(''); setFieldErrors({}); setProgress(0); setPending(true)
    const payload = new FormData()
    payload.append('image', image)
    for (const key of ['category', 'description', 'locationLabel', 'latitude', 'longitude', 'source', 'zoneId']) payload.append(key, form[key])
    try {
      const { report } = await reportService.createReport(payload, setProgress)
      setCreatedReport(report)
    } catch (requestError) {
      setError(requestError.message || 'Your report could not be submitted. Your details are still here; you can retry.')
      if (Array.isArray(requestError.details)) setFieldErrors(Object.fromEntries(requestError.details.map((item) => [item.field, item.message])))
    } finally { setPending(false) }
  }

  if (createdReport) return <section className="report-page">
    <div className="eyebrow"><span className="eyebrow-line" />CITIZEN SPACE / REPORT RECEIVED</div>
    <div className="report-success"><span className="success-icon"><CheckCircle2 size={27} /></span><p className="demo-label">SUBMITTED TO THE PILOT SYSTEM</p><h1>Thank you for<br />making it visible<span className="accent-dot">.</span></h1><p>Your report was saved. You can follow its status from your report details.</p><div className="success-number">REPORT ID <strong>{createdReport.reportNumber}</strong></div><div className="report-actions"><Button to={`/app/reports/${createdReport.id}`} icon="arrowUpRight">Track this report</Button><Link className="text-link" to="/app/reports">View my reports <ArrowUpRight size={15} /></Link></div></div>
  </section>

  return <section className="report-page">
    <div className="eyebrow"><span className="eyebrow-line" />CITIZEN SPACE / NEW REPORT</div>
    <div className="report-page-heading"><div><h1>Report an issue<span className="accent-dot">.</span></h1><p>Share a clear description and location. Your report enters the pilot review queue.</p></div><Link className="text-link" to="/app/reports">My reports <ArrowUpRight size={15} /></Link></div>

    {storageConfigured === false && <div className="report-config-notice"><AlertCircle size={17} /><span>Image uploads require the administrator to configure Cloudinary storage. Your form can be prepared, but submission will stay unavailable until storage is enabled.</span></div>}
    {error && <div className="report-form-alert" role="alert"><AlertCircle size={18} /><span>{error}</span></div>}

    <form className="report-form" onSubmit={submit}>
      <div className="report-form-main">
        <section className="report-form-section"><div className="form-section-heading"><span>01</span><div><h2>Add a photo</h2><p>Use a clear image of the cleanliness issue. Supported: JPEG, PNG, WebP, up to {formatBytes(maximumImageBytes)}.</p></div></div>
          {image ? <div className="image-preview"><img src={previewUrl} alt="Preview of the selected report image" /><div className="image-preview-meta"><span>{image.name} · {formatBytes(image.size)}</span><button type="button" className="icon-button" onClick={() => chooseImage(null)} aria-label="Remove selected image"><X size={17} /></button></div></div> : <label className="image-picker"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseImage(event.target.files?.[0])} aria-describedby="image-help" /><span className="image-picker-icon"><ImagePlus size={23} /></span><strong>Select a photo</strong><span id="image-help">JPEG, PNG, or WebP · up to {formatBytes(maximumImageBytes)}</span></label>}
          {(imageError || fieldErrors.image) && <p className="report-field-error" role="alert">{imageError || fieldErrors.image}</p>}
          {image && <button type="button" className="text-link replace-image" onClick={() => document.getElementById('replace-report-image')?.click()}>Replace image</button>}
          {image && <input id="replace-report-image" className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseImage(event.target.files?.[0])} />}
        </section>

        <section className="report-form-section"><div className="form-section-heading"><span>02</span><div><h2>Describe the issue</h2><p>Choose the closest category and add enough detail to help with review.</p></div></div>
          <label className="report-field">Issue category<select required value={form.category} onChange={setField('category')} aria-invalid={Boolean(fieldErrors.category)}><option value="" disabled>Select a category</option>{REPORT_CATEGORIES.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>{fieldErrors.category && <span className="report-field-error">{fieldErrors.category}</span>}</label>
          <label className="report-field">Description<textarea required minLength={10} maxLength={2000} rows={5} value={form.description} onChange={setField('description')} placeholder="What did you notice? Include a nearby landmark if helpful." aria-invalid={Boolean(fieldErrors.description)} /> <span className="field-hint">{form.description.length}/2000 characters</span>{fieldErrors.description && <span className="report-field-error">{fieldErrors.description}</span>}</label>
        </section>

        <section className="report-form-section"><div className="form-section-heading"><span>03</span><div><h2>Set the location</h2><p>Location is not verified automatically. You can enter a place description without sharing GPS.</p></div></div>
          <button type="button" className="location-button" onClick={useCurrentLocation} disabled={locating || pending}><Navigation2 size={17} />{locating ? 'Finding location…' : 'Use my current location'}</button>
          {locationError && <p className="report-field-error" role="status">{locationError}</p>}
          <label className="report-field">Place or nearby landmark<input required maxLength={200} value={form.locationLabel} onChange={setField('locationLabel')} placeholder="For example, near the main gate" aria-invalid={Boolean(fieldErrors.locationLabel)} />{fieldErrors.locationLabel && <span className="report-field-error">{fieldErrors.locationLabel}</span>}</label>
          <div className="coordinate-fields"><label className="report-field">Latitude <span className="field-hint">Optional</span><input inputMode="decimal" value={form.latitude} onChange={setField('latitude')} placeholder="e.g. 25.62" aria-invalid={Boolean(fieldErrors.latitude)} /></label><label className="report-field">Longitude <span className="field-hint">Optional</span><input inputMode="decimal" value={form.longitude} onChange={setField('longitude')} placeholder="e.g. 85.17" aria-invalid={Boolean(fieldErrors.longitude)} /></label></div>
          {(fieldErrors.latitude || fieldErrors.longitude) && <p className="report-field-error">{fieldErrors.latitude || fieldErrors.longitude}</p>}
          <p className="field-hint location-privacy">Coordinates are stored only when provided. Browser location is requested only when you choose the button above.</p>
          <label className="report-field">Pilot zone <span className="field-hint">Optional</span><select value={form.zoneId} onChange={setField('zoneId')} aria-invalid={Boolean(fieldErrors.zoneId)}><option value="">No zone selected</option>{zones.map((zone) => <option key={zone.zoneId} value={zone.zoneId}>{zone.name}{zone.boundaryVerified ? '' : ' · provisional label'}</option>)}</select>{fieldErrors.zoneId && <span className="report-field-error">{fieldErrors.zoneId}</span>}{zoneNotice && <span className="field-hint">{zoneNotice}</span>}</label>
        </section>
      </div>

      <aside className="report-review"><span className="demo-label">REVIEW BEFORE SENDING</span><h2>Your report</h2>
        <div className="review-image">{previewUrl ? <img src={previewUrl} alt="Selected report preview" /> : <span><ImagePlus size={22} />Photo preview</span>}</div>
        <dl><div><dt>Category</dt><dd>{REPORT_CATEGORIES.find(([value]) => value === form.category)?.[1] || 'Not selected'}</dd></div><div><dt>Description</dt><dd>{form.description || 'Add a short description'}</dd></div><div><dt>Location</dt><dd>{form.locationLabel || 'Add a place or landmark'}</dd></div><div><dt>Zone</dt><dd>{zones.find((zone) => zone.zoneId === form.zoneId)?.name || 'No zone selected'}</dd></div></dl>
        {pending && <div className="upload-progress" role="status"><div className="upload-progress-top"><span>{progress < 100 ? 'Uploading image' : 'Saving report'}</span><span>{progress}%</span></div><progress max="100" value={progress} aria-label="Image upload progress" /></div>}
        <button className="button button-primary report-submit" type="submit" disabled={pending || storageConfigured === false}>{pending ? <><LoaderCircle className="spin-icon" size={16} />Submitting…</> : <>{error ? 'Retry submission' : 'Submit report'} <ArrowUpRight size={16} /></>}</button>
        <p className="report-submit-note">{storageConfigured === false ? 'Submission is disabled until image storage is configured.' : <>Your report starts as <strong>Submitted</strong>. No AI classification or status changes are implied.</>}</p>
      </aside>
    </form>
  </section>
}
