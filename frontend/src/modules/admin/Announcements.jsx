import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Megaphone } from 'lucide-react'
import Card from '../../components/Card'
import Loader from '../../components/Loader'
import EmptyState from '../../components/EmptyState'
import * as adminService from '../../services/adminService'
import { apiErrorMessage } from '../../services/api'

const CATEGORIES = ['course', 'staff', 'assessment', 'achievement']

export default function Announcements() {
  const [list, setList] = useState(null)
  const [form, setForm] = useState({ title: '', body: '', category: 'course' })
  const [submitting, setSubmitting] = useState(false)

  function refresh() {
    adminService.getAnnouncements().then(setList)
  }

  useEffect(refresh, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await adminService.createAnnouncement(form)
      toast.success('Announcement published')
      setForm({ title: '', body: '', category: 'course' })
      refresh()
    } catch (err) {
      toast.error(apiErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-xl font-semibold">Announcements</h1>

      <Card title="Publish a new announcement">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid md:grid-cols-4 gap-3">
            <div className="md:col-span-3">
              <label className="label">Title</label>
              <input
                required
                className="input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Category</label>
              <select
                className="input"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Message</label>
            <textarea
              required
              rows={3}
              className="input"
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
            />
          </div>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'Publishing…' : 'Publish'}
          </button>
        </form>
      </Card>

      <Card title="Published announcements">
        {!list ? (
          <Loader label="Loading…" />
        ) : list.length === 0 ? (
          <EmptyState icon={Megaphone} title="No announcements yet" />
        ) : (
          <ul className="divide-y divide-line">
            {list.map((a) => (
              <li key={a.id} className="py-3">
                <div className="flex items-center gap-2">
                  <span className="badge bg-teal-50 text-teal-600 capitalize">{a.category}</span>
                  <p className="font-medium">{a.title}</p>
                </div>
                <p className="text-sm text-ink/60 mt-1">{a.body}</p>
                <p className="text-xs text-ink/40 mt-1">{new Date(a.created_at).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
