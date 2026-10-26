import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import Button from '../ui/Button.jsx'
import { Icon } from '../ui/Icons.jsx'
import { useAuth } from '../../features/auth/AuthProvider.jsx'
import { dashboardPath } from '../../features/auth/authService.js'
import ThemeToggle from '../ui/ThemeToggle.jsx'

const links = [{ label: 'How it works', to: '/how-it-works' }, { label: 'Pilot zones', to: '/#zones' }, { label: 'Impact', to: '/impact' }]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const reducedMotion = useReducedMotion()
  const { user } = useAuth()
  const accountPath = user ? dashboardPath(user.role) : '/login'
  const reportPath = user?.role === 'citizen' ? '/app/report' : user ? dashboardPath(user.role) : '/login'
  const reportLabel = user && user.role !== 'citizen' ? 'Open workspace' : 'Report an issue'
  const toggleRef = useRef(null)
  const menuRef = useRef(null)
  const location = useLocation()
  useEffect(() => { setOpen(false) }, [location])
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24)
    update(); window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event) => {
      if (event.key === 'Escape') { setOpen(false); return }
      if (event.key !== 'Tab') return
      const items = menuRef.current?.querySelectorAll('a, button:not([disabled])')
      if (!items?.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    menuRef.current?.querySelector('a')?.focus()
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = previous; window.removeEventListener('keydown', onKey); toggleRef.current?.focus() }
  }, [open])

  return <header className={`site-header ${scrolled ? 'is-scrolled' : ''}`}>
    <nav className="nav-inner container" aria-label="Main navigation">
      <Link to="/" className="wordmark" aria-label="SwachhAI home"><span className="brand-mark">S</span><span>swachh<span className="wordmark-ai">AI</span><small>CIVIC INTELLIGENCE</small></span></Link>
      <div className="desktop-nav">{links.map((link) => <Link key={link.label} to={link.to}>{link.label}</Link>)}</div>
      <div className="nav-actions"><ThemeToggle /><Link className="sign-in-link" to={accountPath}>{user ? 'Dashboard' : 'Sign in'} <Icon name="arrowUpRight" size={14} /></Link><Button to={reportPath} icon="arrowUpRight" className="nav-cta">{reportLabel}</Button></div>
      <button ref={toggleRef} className="menu-toggle" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}><Icon name={open ? 'close' : 'menu'} size={23} /></button>
    </nav>
    <AnimatePresence>{open && <motion.nav ref={menuRef} id="mobile-menu" aria-label="Mobile navigation" className="mobile-menu" initial={reducedMotion ? false : { opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -10 }} transition={{ duration: reducedMotion ? 0 : 0.18 }}>
      <div className="mobile-menu-links">{links.map((link, i) => <motion.div key={link.label} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.045 }}><Link to={link.to}>{link.label}<Icon name="arrowUpRight" size={17} /></Link></motion.div>)}</div>
      <div className="mobile-menu-actions"><ThemeToggle /><Link className="mobile-signin" to={accountPath}>{user ? 'Dashboard' : 'Sign in'}</Link><Button to={reportPath} icon="arrowUpRight">{reportLabel}</Button></div>
      <div className="mobile-menu-meta">CIVIC INTELLIGENCE / NIT PATNA PILOT</div>
    </motion.nav>}</AnimatePresence>
  </header>
}
