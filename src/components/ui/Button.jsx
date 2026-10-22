import { Link } from 'react-router-dom'
import { Icon } from './Icons.jsx'

export default function Button({ to, href, children, variant = 'primary', icon, className = '', ...props }) {
  const classes = `button button-${variant} ${className}`
  const content = <>{children}{icon && <Icon name={icon} size={16} />}</>
  if (to) return <Link className={classes} to={to} {...props}>{content}</Link>
  if (href) return <a className={classes} href={href} {...props}>{content}</a>
  return <button className={classes} {...props}>{content}</button>
}
