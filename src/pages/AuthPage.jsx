import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../features/auth/AuthProvider.jsx'
import { dashboardPath } from '../features/auth/authService.js'

function AuthField({ label, type, autoComplete, value, onChange, error, toggle, visible, minLength, maxLength, placeholder }) {
  const inputType = toggle ? (visible ? 'text' : 'password') : type
  const errorId = `${label.toLowerCase().replaceAll(' ', '-')}-error`
  return <label className="auth-field">{label}<span className="auth-input-wrap"><input required name={label.toLowerCase().replaceAll(' ', '-')} type={inputType} autoComplete={autoComplete} value={value} onChange={onChange} minLength={minLength} maxLength={maxLength} placeholder={placeholder} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} />{toggle && <button type="button" className="password-toggle" onClick={toggle} aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button>}</span>{error && <span className="field-error" id={errorId}>{error}</span>}</label>
}

export default function AuthPage({ mode, title }) {
  const isRegister = mode === 'register'
  const { user, status, login, register, sessionError } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [visible, setVisible] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => { if (status === 'authenticated' && user && !pending) navigate(dashboardPath(user.role), { replace: true }) }, [status, user, pending, navigate])
  const update = (key) => (event) => { setForm((current) => ({ ...current, [key]: event.target.value })); setFieldErrors((current) => ({ ...current, [key]: '' })); setError('') }
  const submit = async (event) => {
    event.preventDefault()
    setError(''); setFieldErrors({})
    if (isRegister && form.password !== form.confirmPassword) { setFieldErrors({ confirmPassword: 'Passwords do not match.' }); return }
    setPending(true)
    try {
      const authenticatedUser = isRegister
        ? await register({ name: form.name.trim(), email: form.email.trim(), password: form.password, confirmPassword: form.confirmPassword })
        : await login({ email: form.email.trim(), password: form.password })
      navigate(dashboardPath(authenticatedUser.role), { replace: true })
    } catch (requestError) {
      setError(requestError.message)
      if (Array.isArray(requestError.details)) {
        setFieldErrors(Object.fromEntries(requestError.details.map((item) => [item.field, item.message])))
      }
    } finally { setPending(false) }
  }

  if (status === 'loading') return <section className="auth-page section-pad"><div className="auth-card" role="status">Restoring your session…</div></section>
  if (status === 'authenticated' && user) return null

  return <section className="auth-page section-pad"><div className="auth-card"><div className="eyebrow"><span className="eyebrow-line" />SWACHHAI / SECURE ACCESS</div><h1>{title}<span className="lime-dot">.</span></h1><p>{isRegister ? 'Create a citizen account to enter the SwachhAI pilot workspace.' : 'Sign in to continue to your SwachhAI workspace.'}</p>
    {sessionError && <p className="form-message form-message-warning" role="status">{sessionError}</p>}
    <form onSubmit={submit}>
      {isRegister && <AuthField label="Full name" type="text" autoComplete="name" value={form.name} onChange={update('name')} error={fieldErrors.name} placeholder="Your name" maxLength={80} />}
      <AuthField label="Email address" type="email" autoComplete="email" value={form.email} onChange={update('email')} error={fieldErrors.email} placeholder="you@example.com" maxLength={254} />
      <AuthField label="Password" type="password" autoComplete={isRegister ? 'new-password' : 'current-password'} value={form.password} onChange={update('password')} error={fieldErrors.password} placeholder={isRegister ? 'At least 12 characters' : 'Your password'} minLength={isRegister ? 12 : 1} maxLength={128} visible={visible} toggle={() => setVisible((current) => !current)} />
      {isRegister && <AuthField label="Confirm password" type="password" autoComplete="new-password" value={form.confirmPassword} onChange={update('confirmPassword')} error={fieldErrors.confirmPassword} placeholder="Enter your password again" minLength={12} maxLength={128} visible={visible} toggle={() => setVisible((current) => !current)} />}
      {error && <p className="form-message form-message-error" role="alert">{error}</p>}
      <button className="button button-primary auth-submit" type="submit" disabled={pending}>{pending ? 'Please wait…' : isRegister ? 'Create citizen account' : 'Sign in'}<span aria-hidden="true">↗</span></button>
    </form>
    <span className="form-note">SECURE SESSION · HTTPONLY COOKIE · NO BROWSER TOKEN STORAGE</span>
    <p className="auth-switch">{isRegister ? 'Already have an account?' : 'New to the pilot?'} <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Sign in' : 'Create an account'}</Link></p>
  </div></section>
}
