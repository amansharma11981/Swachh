import { useCallback, useEffect, useState } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { notificationService } from '../../features/notifications/notificationService.js'

export default function NotificationBell() {
  const [data, setData] = useState({ items: [], unreadCount: 0 })
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const refresh = useCallback(async () => {
    try { setData(await notificationService.list()); setError('') }
    catch (e) { setError(e.message || 'Notifications are unavailable.') }
  }, [])
  useEffect(() => {
    refresh()
    const timer = window.setInterval(refresh, 30_000)
    const onFocus = () => refresh()
    window.addEventListener('focus', onFocus)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', onFocus) }
  }, [refresh])
  const openItem = async (item) => {
    if (!item.readAt) {
      try { await notificationService.markRead(item.id); setData((current) => ({ ...current, unreadCount: Math.max(0, current.unreadCount - 1), items: current.items.map((row) => row.id === item.id ? { ...row, readAt: new Date().toISOString() } : row) })) } catch {}
    }
    setOpen(false)
  }
  const markAll = async () => {
    try { await notificationService.markAllRead(); setData((current) => ({ ...current, unreadCount: 0, items: current.items.map((row) => ({ ...row, readAt: row.readAt || new Date().toISOString() })) })) } catch (e) { setError(e.message || 'Could not update notifications.') }
  }
  return <div className="notification-control">
    <button type="button" className="notification-trigger" aria-label={`Notifications, ${data.unreadCount} unread`} aria-expanded={open} onClick={() => setOpen((value) => !value)}><Bell size={17} />{data.unreadCount > 0 && <span className="notification-count">{data.unreadCount > 99 ? '99+' : data.unreadCount}</span>}</button>
    {open && <section className="notification-popover" aria-label="Notifications"><header><strong>Notifications</strong><button type="button" onClick={markAll} disabled={!data.unreadCount}><CheckCheck size={14} /> Mark all read</button></header>{error && <p className="notification-error" role="alert">{error}</p>}{data.items.length ? <ul>{data.items.map((item) => <li key={item.id} className={item.readAt ? '' : 'is-unread'}><Link to={item.href.startsWith('/') && !item.href.startsWith('//') ? item.href : '/'} onClick={() => openItem(item)}><strong>{item.title}</strong><span>{item.message}</span><time>{new Date(item.createdAt).toLocaleString()}</time></Link></li>)}</ul> : <p className="notification-empty">You’re all caught up.</p>}</section>}
  </div>
}
