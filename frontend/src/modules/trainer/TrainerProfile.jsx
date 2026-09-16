import { useEffect, useState } from 'react'
import { UserCircle } from 'lucide-react'
import Card from '../../components/Card'
import Loader from '../../components/Loader'
import StatusBadge from '../../components/StatusBadge'
import * as authService from '../../services/authService'

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs text-ink/50 uppercase tracking-wide">{label}</p>
      <p className="text-sm mt-0.5">{value || '—'}</p>
    </div>
  )
}

export default function TrainerProfile() {
  const [me, setMe] = useState(null)

  useEffect(() => {
    authService.fetchMe().then(setMe)
  }, [])

  if (!me) return <Loader label="Loading profile…" />

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-semibold">Profile</h1>
      <Card>
        <div className="flex items-center gap-3 mb-5">
          <div className="h-12 w-12 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center">
            <UserCircle className="h-7 w-7" />
          </div>
          <div>
            <p className="font-medium text-lg">{me.profile?.full_name}</p>
            <StatusBadge status={me.status} />
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Email" value={me.email} />
          <Field label="Employee ID" value={me.profile?.employee_id} />
          <Field label="Current role" value={me.profile?.current_role_title} />
          <Field label="Phone" value={me.profile?.phone} />
          <Field label="Skills" value={me.profile?.skills} />
          <Field label="Joined" value={new Date(me.created_at).toLocaleDateString()} />
          <div className="md:col-span-2">
            <Field label="Qualifications" value={me.profile?.qualifications} />
          </div>
          <div className="md:col-span-2">
            <Field label="Work experience" value={me.profile?.work_experience} />
          </div>
        </div>
      </Card>
    </div>
  )
}
