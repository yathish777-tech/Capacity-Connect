import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { UserCheck, Check, X } from 'lucide-react'
import Card from '../../components/Card'
import Loader from '../../components/Loader'
import EmptyState from '../../components/EmptyState'
import * as adminService from '../../services/adminService'
import { apiErrorMessage } from '../../services/api'

export default function TraineeApprovals() {
  const [pending, setPending] = useState(null)
  const [busyId, setBusyId] = useState(null)

  function refresh() {
    adminService.getPendingTrainees().then(setPending)
  }

  useEffect(refresh, [])

  async function handleReview(userId, action) {
    setBusyId(userId)
    try {
      await adminService.reviewTrainee(userId, action)
      toast.success(`Trainee ${action}d`)
      refresh()
    } catch (err) {
      toast.error(apiErrorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  if (!pending) return <Loader label="Loading pending trainees…" />

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-semibold">Trainee Approvals</h1>
      <Card>
        {pending.length === 0 ? (
          <EmptyState icon={UserCheck} title="No pending trainee signups" description="You're all caught up." />
        ) : (
          <ul className="divide-y divide-line">
            {pending.map((u) => (
              <li key={u.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{u.profile?.full_name}</p>
                  <p className="text-sm text-ink/60">
                    {u.email} · {u.profile?.employee_id}
                  </p>
                  {u.profile?.qualifications && (
                    <p className="text-xs text-ink/50 mt-1 max-w-lg">{u.profile.qualifications}</p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    disabled={busyId === u.id}
                    onClick={() => handleReview(u.id, 'approve')}
                    className="btn-primary text-sm px-3 py-1.5"
                  >
                    <Check className="h-3.5 w-3.5" /> Approve
                  </button>
                  <button
                    disabled={busyId === u.id}
                    onClick={() => handleReview(u.id, 'reject')}
                    className="btn-secondary text-sm px-3 py-1.5"
                  >
                    <X className="h-3.5 w-3.5" /> Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
