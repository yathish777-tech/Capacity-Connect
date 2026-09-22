import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Check, Pencil, UserCircle, X } from 'lucide-react'
import Card from '../../components/Card'
import Loader from '../../components/Loader'
import StatusBadge from '../../components/StatusBadge'
import * as authService from '../../services/authService'
import * as trainerService from '../../services/trainerService'
import { apiErrorMessage } from '../../services/api'

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs text-ink/50 uppercase tracking-wide">{label}</p>
      <p className="text-sm mt-0.5">{value || '-'}</p>
    </div>
  )
}

function EditInput({ label, field, value, onChange }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" value={value || ''} onChange={(e) => onChange(field, e.target.value)} />
    </div>
  )
}

function EditTextarea({ label, field, value, onChange }) {
  return (
    <div className="md:col-span-2">
      <label className="label">{label}</label>
      <textarea className="input min-h-24" value={value || ''} onChange={(e) => onChange(field, e.target.value)} />
    </div>
  )
}

export default function TrainerProfile() {
  const [me, setMe] = useState(null)
  const [form, setForm] = useState({})
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    authService.fetchMe().then((data) => {
      setMe(data)
      setForm(data.profile || {})
    })
  }, [])

  if (!me) return <Loader label="Loading profile..." />

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function cancelEdit() {
    setForm(me.profile || {})
    setEditing(false)
  }

  async function saveProfile(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const updated = await trainerService.updateProfile({
        full_name: form.full_name,
        current_role_title: form.current_role_title,
        phone: form.phone,
        skills: form.skills,
        qualifications: form.qualifications,
        work_experience: form.work_experience,
      })
      setMe(updated)
      setForm(updated.profile || {})
      setEditing(false)
      toast.success('Profile updated')
    } catch (err) {
      toast.error(apiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold">Profile</h1>
        {!editing && (
          <button onClick={() => setEditing(true)} className="btn-secondary text-sm">
            <Pencil className="h-4 w-4" /> Edit
          </button>
        )}
      </div>

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

        {editing ? (
          <form onSubmit={saveProfile} className="grid md:grid-cols-2 gap-4">
            <EditInput label="Full name" field="full_name" value={form.full_name} onChange={update} />
            <EditInput label="Current role" field="current_role_title" value={form.current_role_title} onChange={update} />
            <EditInput label="Phone" field="phone" value={form.phone} onChange={update} />
            <EditInput label="Skills" field="skills" value={form.skills} onChange={update} />
            <EditTextarea label="Qualifications" field="qualifications" value={form.qualifications} onChange={update} />
            <EditTextarea label="Work experience" field="work_experience" value={form.work_experience} onChange={update} />
            <div className="md:col-span-2 flex gap-2">
              <button disabled={saving} className="btn-primary text-sm">
                <Check className="h-4 w-4" /> Save
              </button>
              <button type="button" disabled={saving} onClick={cancelEdit} className="btn-secondary text-sm">
                <X className="h-4 w-4" /> Cancel
              </button>
            </div>
          </form>
        ) : (
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
        )}
      </Card>
    </div>
  )
}
