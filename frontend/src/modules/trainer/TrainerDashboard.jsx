import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import toast from 'react-hot-toast'
import { LayoutDashboard, UserCircle, ListChecks, Users, UploadCloud, Check, X } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout'
import Card from '../../components/Card'
import Loader from '../../components/Loader'
import EmptyState from '../../components/EmptyState'
import StatusBadge from '../../components/StatusBadge'
import * as trainerService from '../../services/trainerService'
import { apiErrorMessage } from '../../services/api'

export const NAV_ITEMS = [
  { to: '/trainer', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/trainer/profile', label: 'Profile', icon: UserCircle },
  { to: '/trainer/question-bank', label: 'Question Bank', icon: ListChecks },
  { to: '/trainer/monitoring', label: 'Trainee Monitoring', icon: Users },
  { to: '/trainer/materials', label: 'Material Upload', icon: UploadCloud },
]

export function TrainerOverview() {
  const [requests, setRequests] = useState(null)
  const [courses, setCourses] = useState(null)
  const [busyId, setBusyId] = useState(null)

  function refresh() {
    trainerService.getMyCourseRequests().then(setRequests)
    trainerService.getMyCourses().then(setCourses)
  }

  useEffect(refresh, [])

  async function respond(requestId, accept) {
    setBusyId(requestId)
    try {
      await trainerService.respondToCourseRequest(requestId, accept)
      toast.success(accept ? 'Course accepted — your dashboard is now unlocked for it' : 'Course request declined')
      refresh()
    } catch (err) {
      toast.error(apiErrorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  const pendingRequests = (requests || []).filter((r) => r.status === 'requested')

  return (
    <div className="space-y-6">
      <h1 className="font-display text-xl font-semibold">Trainer Dashboard</h1>

      <Card title="Course requests">
        {!requests ? (
          <Loader label="Loading requests…" />
        ) : pendingRequests.length === 0 ? (
          <EmptyState title="No pending course requests" description="An Admin will send a request once your competencies match a course." />
        ) : (
          <ul className="divide-y divide-line">
            {pendingRequests.map((r) => (
              <li key={r.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">Course #{r.course_id}</p>
                  {r.message && <p className="text-sm text-ink/60">{r.message}</p>}
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={busyId === r.id}
                    onClick={() => respond(r.id, true)}
                    className="btn-primary text-sm px-3 py-1.5"
                  >
                    <Check className="h-3.5 w-3.5" /> Accept
                  </button>
                  <button
                    disabled={busyId === r.id}
                    onClick={() => respond(r.id, false)}
                    className="btn-secondary text-sm px-3 py-1.5"
                  >
                    <X className="h-3.5 w-3.5" /> Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="My courses">
        {!courses ? (
          <Loader label="Loading courses…" />
        ) : courses.length === 0 ? (
          <EmptyState title="No courses assigned yet" description="Accept a course request above to unlock question banks, materials and monitoring for it." />
        ) : (
          <ul className="divide-y divide-line">
            {courses.map((c) => (
              <li key={c.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">{c.title}</p>
                  <p className="text-sm text-ink/60">{c.category}</p>
                </div>
                <StatusBadge status={c.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

export default function TrainerDashboard() {
  return (
    <DashboardLayout navItems={NAV_ITEMS}>
      <Outlet />
    </DashboardLayout>
  )
}
