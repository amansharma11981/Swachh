import { demoMetrics, demoReports } from '../../data/content.js'
import MiniMap from './MiniMap.jsx'
import { Icon } from '../ui/Icons.jsx'

export default function CommandPreview() {
  return <section className="command section-pad" id="platform-preview">
    <div className="container">
      <div className="command-top"><div><div className="eyebrow"><span className="eyebrow-line" />THE PLATFORM / AT A GLANCE</div><h2>One view.<br /><span>Clearer action.</span></h2></div><p>A considered preview of how citizen reports and team follow-through could come together. Sample data only.</p></div>
      <div className="command-panel">
        <div className="command-bar"><div className="command-brand"><span className="brand-mark small-mark">S</span><span>SWACHHAI <span className="command-sep">/</span> OPERATIONS</span></div><span className="demo-label">ILLUSTRATIVE PREVIEW</span><button className="command-date" type="button" aria-label="Date shown is illustrative"><Icon name="clock" size={14} /> TODAY <Icon name="chevronDown" size={13} /></button></div>
        <div className="metric-row">{demoMetrics.map((metric) => <div className="metric" key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.note}</small></div>)}</div>
        <div className="command-content"><div className="command-map-wrap"><div className="subpanel-title"><span>REPORT OVERVIEW</span><span className="map-key"><i /> PROPOSED PILOT AREAS</span></div><MiniMap compact /></div>
          <div className="report-panel"><div className="subpanel-title"><span>RECENT REPORTS</span><span className="report-count">03</span></div><div className="report-list">{demoReports.map((report) => <article className="report-row" key={report.title}><span className={`report-status status-${report.tone}`} /><div><h3>{report.title}</h3><p>{report.zone}</p></div><span className={`status-label text-${report.tone}`}>{report.status}</span></article>)}</div><div className="panel-footnote">DEMO CONTENT · NOT LIVE OPERATIONAL DATA</div></div>
        </div>
        <div className="command-bottom"><span><i className="live-dot" /> PREVIEW MODE</span><span>DESIGNED FOR PEOPLE. BUILT FOR THE CITY. <Icon name="arrowUpRight" size={14} /></span></div>
      </div>
    </div>
  </section>
}
