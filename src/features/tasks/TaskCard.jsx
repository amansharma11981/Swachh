import { ArrowUpRight, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import TaskStatus from './TaskStatus.jsx'
import { taskDate } from './taskService.js'

export default function TaskCard({ task, base = '/worker/tasks' }) {
  return <article className="task-card">
    <div className="task-card-body">
      <div className="task-card-top"><span className="task-reference">{task.reportNumber}</span><TaskStatus status={task.status} /></div>
      <h3>{task.category?.replaceAll('_', ' ') || 'Cleanliness report'}</h3>
      <p>{task.description}</p>
      <div className="task-card-meta"><span><MapPin size={14} />{task.location?.label || 'Location not provided'}</span><span className={`task-priority task-priority-${task.priority || 'normal'}`}>{task.priority || 'normal'} priority</span><span>Updated {taskDate(task.updatedAt || task.createdAt)}</span></div>
    </div>
    <Link className="task-open-link" to={`${base}/${task.id || task._id}`}>Open task <ArrowUpRight size={15} /></Link>
  </article>
}
