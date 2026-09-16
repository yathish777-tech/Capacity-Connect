import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { ClipboardList, Send } from 'lucide-react'
import Card from '../../components/Card'
import Loader from '../../components/Loader'
import EmptyState from '../../components/EmptyState'
import StatusBadge from '../../components/StatusBadge'
import * as adminService from '../../services/adminService'
import { apiErrorMessage } from '../../services/api'

const initialForm = { title: '', description: '', category: '', duration_hours: 6, subject_tag_names: '' }

export default function TrainerRequirements() {
  const [courses, setCourses] = useState(null)
  const [form, setForm] = useState(initialForm)
  const [creating, setCreating] = useState(false)
  const [activeCourseId, setActiveCourseId] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)

  function refresh() {
    adminService.getAdminCourses().then(setCourses)
  }

  useEffect(refresh, [])

  const unassigned = (courses || []).filter((c) => c.assignment_status === 'unassigned')

  async function handleCreate(e) {
    e.preventDefault()
    setCreating(true)
    try {
      await adminService.createCourse({
        ...form,
        duration_hours: Number(form.duration_hours) || 1,
        subject_tag_names: form.subject_tag_names.split(',').map((t) => t.trim()).filter(Boolean),
      })
      toast.success('Training need created')
      setForm(initialForm)
      refresh()
    } catch (err) {
      toast.error(apiErrorMessage(err))
    } finally {
      setCreating(false)
    }
  }

  async function viewSuggestions(courseId) {
    setActiveCourseId(courseId)
    setLoadingSuggestions(true)
    try {
      const data = await adminService.getTrainerSuggestions(courseId)
      setSuggestions(data)
    } catch (err) {
      toast.error(apiErrorMessage(err))
    } finally {
      setLoadingSuggestions(false)
    }
  }

  async function sendRequest(trainerId) {
    try {
      await adminService.sendCourseRequest(activeCourseId, trainerId)
      toast.success('Course request sent')
      setActiveCourseId(null)
      refresh()
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-xl font-semibold">Trainer Requirements</h1>

      <Card title="Define a new training need">
        <form onSubmit={handleCreate} className="grid md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <label className="label">Course title</label>
            <input
              required
              className="input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Category</label>
            <input
              className="input"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Duration (hours)</label>
            <input
              type="number"
              min={1}
              className="input"
              value={form.duration_hours}
              onChange={(e) => setForm({ ...form, duration_hours: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <label className="label">Subject tags (comma-separated)</label>
            <input
              className="input"
              placeholder="Radar Systems, AWS Sensor Calibration"
              value={form.subject_tag_names}
              onChange={(e) => setForm({ ...form, subject_tag_names: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <label className="label">Description</label>
            <textarea
              className="input"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <button type="submit" disabled={creating} className="btn-primary">
              {creating ? 'Creating…' : 'Create training need'}
            </button>
          </div>
        </form>
      </Card>

      <Card title="Awaiting a trainer">
        {!courses ? (
          <Loader label="Loading courses…" />
        ) : unassigned.length === 0 ? (
          <EmptyState icon={ClipboardList} title="Every course has a trainer assigned or requested" />
        ) : (
          <ul className="divide-y divide-line">
            {unassigned.map((c) => (
              <li key={c.id} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{c.title}</p>
                    <p className="text-sm text-ink/60">{c.category}</p>
                  </div>
                  <button onClick={() => viewSuggestions(c.id)} className="btn-secondary text-sm px-3 py-1.5">
                    View matched trainers
                  </button>
                </div>

                {activeCourseId === c.id && (
                  <div className="mt-3 bg-paper rounded p-3">
                    {loadingSuggestions ? (
                      <Loader label="Ranking trainers…" />
                    ) : suggestions.length === 0 ? (
                      <p className="text-sm text-ink/50">No trainers match this course's subject tags yet.</p>
                    ) : (
                      <ul className="space-y-2">
                        {suggestions.map((s) => (
                          <li key={s.trainer_id} className="flex items-center justify-between text-sm">
                            <div>
                              <span className="font-medium">{s.full_name}</span>{' '}
                              <span className="text-ink/50">
                                ({Math.round(s.match_score * 100)}% match · {s.matched_tags.join(', ')})
                              </span>
                            </div>
                            <button onClick={() => sendRequest(s.trainer_id)} className="btn-primary text-xs px-2.5 py-1">
                              <Send className="h-3 w-3" /> Send request
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="All courses">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink/50 border-b border-line">
                <th className="py-2 pr-4">Title</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Assignment</th>
              </tr>
            </thead>
            <tbody>
              {(courses || []).map((c) => (
                <tr key={c.id} className="border-b border-line last:border-0">
                  <td className="py-2 pr-4">{c.title}</td>
                  <td className="py-2 pr-4">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="py-2 pr-4">
                    <StatusBadge status={c.assignment_status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
