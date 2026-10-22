import { useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { zones, steps, capabilities } from '../data/content.js'
import Button from '../components/ui/Button.jsx'
import SectionHeading from '../components/ui/SectionHeading.jsx'
import { Icon } from '../components/ui/Icons.jsx'
import MiniMap from '../components/sections/MiniMap.jsx'
import CommandPreview from '../components/sections/CommandPreview.jsx'

gsap.registerPlugin(ScrollTrigger)

function useReveals() {
  const root = useRef(null)
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const ctx = gsap.context(() => {
      if (reduced) return
      gsap.from('.hero-copy > *', { y: 22, opacity: 0, duration: 0.72, stagger: 0.12, ease: 'power3.out', delay: 0.12 })
      gsap.from('.hero-art', { y: 20, opacity: 0, duration: 0.9, ease: 'power2.out', delay: 0.35 })
      gsap.utils.toArray('[data-reveal]').forEach((el) => gsap.from(el, { y: 26, opacity: 0, duration: 0.7, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } }))
    }, root)
    return () => ctx.revert()
  }, [])
  return root
}

function Hero() {
  return <section className="hero"><div className="hero-noise" /><div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
    <div className="container hero-layout"><div className="hero-copy"><div className="eyebrow"><span className="live-dot" />CIVIC INTELLIGENCE <i>/</i> NIT PATNA PILOT</div><h1>Cleaner streets.<br /><span className="heading-italic">Smarter</span> cities<span className="lime-dot">.</span></h1><p>Turn everyday cleanliness problems into visible action through AI-assisted reporting, location intelligence, and accountable resolution.</p><div className="hero-actions"><Button to="/app/report" icon="arrowUpRight">Report a problem</Button><Button to="/how-it-works" variant="text" icon="arrowDownRight">Explore the platform</Button></div><div className="hero-proof"><span className="proof-mark"><Icon name="shield" size={16} /></span><span>BUILT AROUND PEOPLE<br /><b>DESIGNED FOR SHARED SPACES</b></span><span className="proof-divider" /><span className="hero-index">01 <i>/</i> 08</span></div></div>
      <div className="hero-art"><div className="hero-art-top"><span>FIELD NOTES <b>·</b> 01</span><span>LOCATION INTELLIGENCE <i>*</i></span></div><div className="hero-map-shell"><MiniMap /><div className="map-float float-report"><span className="float-icon"><Icon name="recycle" size={16} /></span><div><b>Waste concern</b><small>PROPOSED AREA / ZONE 01</small></div><span className="float-dot" /></div><div className="map-float float-note"><span className="live-dot" /> A MORE CONNECTED PILOT</div></div><div className="hero-art-bottom"><span>OBSERVE <b>→</b> COORDINATE <b>→</b> RESOLVE</span><span>VISUALIZATION ONLY · NO LIVE DATA</span></div><span className="hero-stamp">S<span>—</span>AI</span></div></div>
    <a className="scroll-cue" href="#platform-preview"><span>SCROLL TO EXPLORE</span><i /></a>
  </section>
}

function Workflow() {
  return <section className="workflow section-pad"><div className="container"><div className="workflow-head" data-reveal><SectionHeading eyebrow="A BETTER LOOP / NOT ANOTHER FORM" title={<>Small signals.<br /><span className="heading-italic">Thoughtful follow-through.</span></>} body="A good civic tool makes each next step easier to understand—for the person reporting and the people responding." /><div className="workflow-aside"><span>THE PROPOSED FLOW</span><p>Built to support clear hand-offs, with human review at the centre.</p><Icon name="arrowDownRight" size={22} /></div></div><div className="steps-grid">{steps.map((step) => <article className="step-card" data-reveal key={step.number}><div className="step-card-top"><span>{step.number} <i>/ 04</i></span><span className="step-icon"><Icon name={step.icon} size={20} /></span></div><h3>{step.title}</h3><p>{step.text}</p><div className="step-card-line" /></article>)}</div></div></section>
}

function Zones() {
  return <section className="zones section-pad" id="zones"><div className="container"><div className="zones-head" data-reveal><SectionHeading eyebrow="A PLACE TO BEGIN / PROVISIONAL AREAS" title={<>Start close<br />to <span className="heading-italic">home.</span></>} body="Three proposed focus areas give the pilot a grounded starting point. Names and boundaries are provisional—not verified geographical zones." /><Link to="/app/map" className="text-link">Explore the concept map <Icon name="arrowUpRight" size={15} /></Link></div><div className="zones-layout"><div className="zones-visual" data-reveal><MiniMap /><div className="zone-map-legend"><span><i className="legend-dot" /> PROPOSED FOCUS AREA</span><span>CONCEPTUAL MAP / NOT TO SCALE</span></div></div><div className="zone-list">{zones.map((zone) => <article className="zone-row" data-reveal key={zone.id}><span className="zone-number">{zone.id}<i>/03</i></span><div className="zone-icon"><Icon name={zone.icon} size={19} /></div><div className="zone-copy"><h3>{zone.name}</h3><p>{zone.description}</p><span className="proposed-label"><i />PROPOSED PILOT AREA</span></div><Link aria-label={`Explore ${zone.name} concept`} to="/app/map" className="zone-arrow"><Icon name="arrowUpRight" size={17} /></Link></article>)}</div></div></div></section>
}

function Features() {
  return <section className="features section-pad"><div className="container"><div className="features-head" data-reveal><SectionHeading eyebrow="THE PLATFORM / BY DESIGN" title={<>From report<br />to <span className="heading-italic">resolution.</span></>} body="A connected set of capabilities that can help a local concern find the right next step." /><span className="features-note">A FOUNDATION FOR THE PILOT<br />BUILT IN PHASES, WITH CARE.</span></div><div className="feature-grid">{capabilities.map((feature) => <article className={`feature-item ${feature.className}`} data-reveal key={feature.number}><div className="feature-top"><span>{feature.number} <i>/ 06</i></span><Icon name={feature.icon} size={19} /></div><div className="feature-visual"><div className={`feature-glyph glyph-${feature.number}`}><Icon name={feature.icon} size={feature.number === '01' ? 36 : 28} /><span /><i /></div></div><h3>{feature.title}</h3><p>{feature.text}</p></article>)}</div><div className="feature-relationship"><span>NOTICE</span><i /><span>PRIORITIZE</span><i /><span>COORDINATE</span><i /><span>RESOLVE</span><span className="relationship-note">A MORE LEGIBLE LOOP / FOR EVERYONE</span></div></div></section>
}

function Impact() {
  const items = [{ n: '01', title: 'Faster to report', copy: 'Give everyday observations a clearer path into the conversation.' }, { n: '02', title: 'Easier to follow', copy: 'Make the status and next step more visible to the people involved.' }, { n: '03', title: 'Clearer ownership', copy: 'Support better hand-offs between reporters, reviewers and field teams.' }, { n: '04', title: 'Learn by place', copy: 'Build a shared understanding of local needs across proposed zones.' }]
  return <section className="impact section-pad"><div className="impact-glow" /><div className="container impact-layout"><div className="impact-intro" data-reveal><div className="eyebrow"><span className="eyebrow-line" />THE MEASURE THAT MATTERS / INTENT</div><h2>Make the right<br />things <span className="heading-italic">visible.</span></h2><p>A platform should make everyday work easier to see and coordinate. These are the outcomes SwachhAI hopes to explore—not measured results.</p><Button to="/impact" variant="secondary" icon="arrowUpRight">Impact & methodology</Button></div><div className="impact-list">{items.map((item) => <article data-reveal key={item.n}><span>{item.n}</span><div><h3>{item.title}</h3><p>{item.copy}</p></div><Icon name="arrowUpRight" size={16} /></article>)}<div className="impact-disclaimer">INTENDED OUTCOMES ONLY <i>·</i> NO PERFORMANCE METRICS CLAIMED</div></div></div></section>
}

function FinalCallout() {
  return <section className="final-cta"><div className="container"><div className="cta-ring" /><div className="eyebrow"><span className="live-dot" />A CLEANER PILOT STARTS HERE</div><h2>Better streets begin<br />with <span className="heading-italic">one report.</span></h2><p>Be part of a more connected conversation about the places we share.</p><div className="hero-actions"><Button to="/app/report" variant="dark" icon="arrowUpRight">Report a problem</Button><Button to="/how-it-works" variant="cta-text" icon="arrowRight">Explore how it works</Button></div><span className="cta-sidenote">CIVIC INTELLIGENCE / NIT PATNA</span></div></section>
}

export default function LandingPage() {
  const root = useReveals()
  const location = useLocation()
  useEffect(() => {
    if (!location.hash) return undefined
    const frame = window.requestAnimationFrame(() => document.querySelector(location.hash)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }))
    return () => window.cancelAnimationFrame(frame)
  }, [location.hash])
  return <div ref={root}><Hero /><CommandPreview /><Workflow /><Zones /><Features /><Impact /><FinalCallout /></div>
}
