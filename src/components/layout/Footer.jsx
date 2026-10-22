import { Link } from 'react-router-dom'

export default function Footer() {
  return <footer className="site-footer"><div className="container"><div className="footer-main">
    <div className="footer-brand"><Link to="/" className="wordmark"><span className="brand-mark">S</span><span>swachh<span className="wordmark-ai">AI</span><small>CIVIC INTELLIGENCE</small></span></Link><p>A civic cleanliness project concept for a more visible, connected NIT Patna.</p></div>
    <div className="footer-col"><span>EXPLORE</span><Link to="/how-it-works">How it works</Link><Link to="/#zones">Pilot zones</Link><Link to="/impact">Impact & methodology</Link></div>
    <div className="footer-col"><span>PARTICIPATE</span><Link to="/app/report">Report a problem</Link><Link to="/login">Sign in</Link><Link to="/accessibility">Accessibility</Link></div>
    <div className="footer-note"><div className="eyebrow"><i className="live-dot" /> PROPOSED PILOT / PATNA</div><p>Zone names are provisional. Boundaries and services are not yet operational.</p></div>
  </div><div className="footer-bottom"><span>© {new Date().getFullYear()} SWACHHAI · ACADEMIC PROJECT CONCEPT, NIT PATNA</span><div><Link to="/privacy">Privacy</Link><Link to="/accessibility">Accessibility</Link><span>BUILT FOR BETTER SHARED SPACES <b>↗</b></span></div></div></div></footer>
}
