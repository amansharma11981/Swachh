export const zones = [
  { id: '01', name: 'NIT More Street-Food Lane', description: 'A proposed focus area for observing shared public-space needs around the campus approach.', icon: 'utensils' },
  { id: '02', name: 'Ashok Rajpath Construction Zone', description: 'A provisional area to explore how temporary barriers shape cleanliness reporting.', icon: 'construction' },
  { id: '03', name: 'NIT / Gandhi Ghat', description: 'A proposed riverfront corridor for community-led cleanliness visibility.', icon: 'waves' },
]

export const demoMetrics = [
  { label: 'Reports submitted', value: '128', note: 'Illustrative sample' },
  { label: 'Open reports', value: '34', note: 'Illustrative sample' },
  { label: 'Resolved', value: '82', note: 'Illustrative sample' },
  { label: 'Active assignments', value: '12', note: 'Illustrative sample' },
]

export const demoReports = [
  { title: 'Mixed waste near campus gate', zone: 'NIT More · Zone 01', status: 'Under review', time: '12 min ago', tone: 'amber' },
  { title: 'Overflowing public bin', zone: 'Gandhi Ghat · Zone 03', status: 'Assigned', time: '38 min ago', tone: 'blue' },
  { title: 'Construction debris on footpath', zone: 'Ashok Rajpath · Zone 02', status: 'Resolved', time: '1 hr ago', tone: 'green' },
]

export const steps = [
  { number: '01', title: 'Notice it.', text: 'Capture a cleanliness concern and add a photo when useful.', icon: 'camera' },
  { number: '02', title: 'Make sense of it.', text: 'AI-assisted classification can help describe waste type and urgency.', icon: 'sparkles' },
  { number: '03', title: 'Get it to the right team.', text: 'A responsible team reviews the report and coordinates next steps.', icon: 'route' },
  { number: '04', title: 'Close the loop.', text: 'Document completion and keep the reporter informed.', icon: 'check' },
]

export const capabilities = [
  { number: '01', title: 'Reporting made human', text: 'A clear, considered way to share what needs attention.', icon: 'camera', className: 'feature-tall' },
  { number: '02', title: 'AI-assisted clarity', text: 'Structured descriptions can help teams interpret a report consistently.', icon: 'sparkles', className: '' },
  { number: '03', title: 'Place with context', text: 'Location intelligence connects reports to proposed pilot areas.', icon: 'map', className: '' },
  { number: '04', title: 'Teams in sync', text: 'A shared view of assignments can make follow-through visible.', icon: 'users', className: '' },
  { number: '05', title: 'Resolution with proof', text: 'A documented close-out can show what happened next.', icon: 'check', className: '' },
  { number: '06', title: 'Ready for what is next', text: 'A foundation for future smart-bin signals and operational analytics.', icon: 'activity', className: '' },
]
