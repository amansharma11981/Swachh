export default function SectionHeading({ eyebrow, title, body, light = false }) {
  return <div className={`section-heading ${light ? 'heading-light' : ''}`}>
    {eyebrow && <div className="eyebrow"><span className="eyebrow-line" />{eyebrow}</div>}
    <h2>{title}</h2>
    {body && <p>{body}</p>}
  </div>
}
