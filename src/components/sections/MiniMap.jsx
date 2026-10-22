import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { Icon } from '../ui/Icons.jsx'

export default function MiniMap({ compact = false }) {
  const markers = useRef(null)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const ctx = gsap.context(() => {
      gsap.fromTo('.map-pin', { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, stagger: 0.14, duration: 0.45, ease: 'back.out(1.8)', delay: 0.25 })
    }, markers)
    return () => ctx.revert()
  }, [])
  return <div className={`mini-map ${compact ? 'mini-map-compact' : ''}`} ref={markers} role="img" aria-label="Illustrative map showing three sample report markers around proposed pilot areas. No live location data is shown.">
    <div className="map-grid" />
    <svg className="map-lines" viewBox="0 0 600 390" preserveAspectRatio="none" aria-hidden="true">
      <path d="M-20 300 C90 245 140 255 203 191 S310 140 368 171 440 245 630 87" />
      <path d="M55 -15 C96 92 175 111 153 202 S111 296 144 414" />
      <path d="M398 -15 C343 78 373 101 332 156 S263 230 300 409" />
      <path d="M-10 124 C93 169 158 149 235 110 S364 57 605 135" />
      <path className="map-road" d="M-10 213 C102 184 155 212 240 202 S421 180 610 251" />
      <path className="map-water" d="M403 -15 C428 56 419 100 464 153 S516 260 618 289" />
      <path className="map-route" d="M91 269 C168 230 208 243 283 185 S378 161 470 101" />
    </svg>
    <span className="map-label label-nit">NIT PATNA</span><span className="map-label label-gandhi">GANDHI GHAT</span><span className="map-label label-rajpath">ASHOK RAJPATH</span>
    <span className="map-pin pin-one"><Icon name="recycle" size={15} /></span><span className="map-pin pin-two"><Icon name="activity" size={15} /></span><span className="map-pin pin-three"><Icon name="mapPin" size={15} /></span>
    <div className="map-compass">N <span>↑</span></div>
    {!compact && <div className="map-maptag"><span className="live-dot" />PILOT AREA / PROPOSED</div>}
  </div>
}
