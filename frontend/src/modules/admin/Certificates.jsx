import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Award, Check, X } from 'lucide-react'
import Card from '../../components/Card'
import Loader from '../../components/Loader'
import EmptyState from '../../components/EmptyState'
import * as adminService from '../../services/adminService'
import { apiErrorMessage } from '../../services/api'

export default function Certificates() {
  const [pending, setPending] = useState(null)
  const [busyId, setBusyId] = useState(null)

  function refresh() {
    adminService.getPendingCertificates().then(setPending)
  }

  useEffect(refresh, [])

  async function handleReview(certificateId, action) {
    setBusyId(certificateId)
    try {
      await adminService.reviewCertificate(certificateId, action)
      toast.success(action === 'issue' ? 'Certificate issued' : 'Request rejected')
      refresh()
    } catch (err) {
      toast.error(apiErrorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  if (!pending) return <Loader label="Loading certificate requests…" />

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-semibold">Certificates</h1>
      <Card title="Pending requests">
        {pending.length === 0 ? (
          <EmptyState icon={Award} title="No pending certificate requests" />
        ) : (
          <ul className="divide-y divide-line">
            {pending.map((c) => (
              <li key={c.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">Trainee #{c.trainee_id} · Course #{c.course_id}</p>
                  <p className="text-sm text-ink/60">
                    Score at completion: {c.score_at_issue ?? '—'} · Requested {new Date(c.requested_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    disabled={busyId === c.id}
                    onClick={() => handleReview(c.id, 'issue')}
                    className="btn-primary text-sm px-3 py-1.5"
                  >
                    <Check className="h-3.5 w-3.5" /> Issue
                  </button>
                  <button
                    disabled={busyId === c.id}
                    onClick={() => handleReview(c.id, 'reject')}
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
