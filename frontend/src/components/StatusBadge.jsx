const STYLES = {
  pending: 'bg-amber-50 text-amber-600',
  requested: 'bg-amber-50 text-amber-600',
  in_progress: 'bg-amber-50 text-amber-600',
  approved: 'bg-success-50 text-success-600',
  accepted: 'bg-success-50 text-success-600',
  published: 'bg-success-50 text-success-600',
  issued: 'bg-success-50 text-success-600',
  completed: 'bg-success-50 text-success-600',
  submitted: 'bg-success-50 text-success-600',
  enrolled: 'bg-teal-50 text-teal-600',
  draft: 'bg-navy-800/10 text-navy-800',
  rejected: 'bg-red-50 text-red-600',
  declined: 'bg-red-50 text-red-600',
  auto_submitted: 'bg-red-50 text-red-600',
  unassigned: 'bg-navy-800/10 text-navy-800',
}

export default function StatusBadge({ status }) {
  const style = STYLES[status] || 'bg-navy-800/10 text-navy-800'
  return <span className={`badge ${style}`}>{status?.replace(/_/g, ' ')}</span>
}
