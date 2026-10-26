import { useEffect, useState } from 'react'
import { Check, LoaderCircle, UserRound } from 'lucide-react'
import { useAuth } from '../features/auth/AuthProvider.jsx'

export default function ProfilePage() {
  const { user, updateProfile } = useAuth()
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '' })
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  useEffect(() => { setForm({ name: user?.name || '', phone: user?.phone || '' }) }, [user?.name, user?.phone])
  const save = async (event) => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('')
    try { await updateProfile(form); setNotice('Profile updated.') }
    catch (requestError) { setError(requestError.message || 'Could not update your profile.') }
    finally { setBusy(false) }
  }
  return <section className="workspace-page profile-page"><header className="page-heading"><span className="page-kicker">ACCOUNT</span><h1>Your profile</h1><p>Update the details attached to your SwachhAI account.</p></header><div className="profile-card"><div className="profile-avatar"><UserRound size={24} /></div><div><strong>{user?.name}</strong><span>{user?.email}</span><span className="profile-role">{user?.role}</span></div></div><form className="settings-form" onSubmit={save}><label>Full name<input required minLength={2} maxLength={80} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></label><label>Email address<input readOnly value={user?.email || ''} aria-describedby="profile-email-note" /></label><p id="profile-email-note" className="settings-note">Email is your sign-in identifier and cannot be changed here.</p><label>Phone number <span className="settings-note">Optional</span><input maxLength={30} autoComplete="tel" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} /></label>{error && <p role="alert" className="inline-error">{error}</p>}{notice && <p role="status" className="inline-success"><Check size={15} />{notice}</p>}<button className="button button-primary" type="submit" disabled={busy}>{busy ? <><LoaderCircle className="spin-icon" size={16} />Saving…</> : 'Save profile'}</button></form></section>
}
