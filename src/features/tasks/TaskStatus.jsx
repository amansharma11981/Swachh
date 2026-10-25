import { taskLabel } from './taskService.js'

export default function TaskStatus({ status }) {
  return <span className={`task-status task-status-${status || 'unknown'}`}>{taskLabel(status)}</span>
}
