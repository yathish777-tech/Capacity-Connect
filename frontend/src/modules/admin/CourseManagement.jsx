import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { FileText, Check, X } from 'lucide-react'
import Card from '../../components/Card'
import Loader from '../../components/Loader'
import EmptyState from '../../components/EmptyState'
import StatusBadge from '../../components/StatusBadge'
import * as adminService from '../../services/adminService'
import { apiErrorMessage } from '../../services/api'

export default function CourseManagement() {
  const [materials, setMaterials] = useState(null)
  const [courses, setCourses] = useState([])
  const [busyId, setBusyId] = useState(null)

  function refresh() {
    adminService.getPendingMaterials().then(setMaterials)
  }

  useEffect(() => {
    refresh()
    adminService.getAdminCourses().then(setCourses)
  }, [])

  async function handleReview(materialId, action) {
    setBusyId(materialId)
    try {
      await adminService.reviewMaterial(materialId, action)
      toast.success(
        action === 'approve'
          ? 'Material approved — now visible to trainees and indexed for the AI Doubt Bot'
          : 'Material rejected'
      )
      refresh()
    } catch (err) {
      toast.error(apiErrorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  const courseTitleById = Object.fromEntries(courses.map((c) => [c.id, c.title]))

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-semibold">Course Management</h1>

      <Card title="Materials pending review">
        {!materials ? (
          <Loader label="Loading materials…" />
        ) : materials.length === 0 ? (
          <EmptyState icon={FileText} title="Nothing pending" description="All submitted materials have been reviewed." />
        ) : (
          <ul className="divide-y divide-line">
            {materials.map((m) => (
              <li key={m.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{m.title}</p>
                  <p className="text-sm text-ink/60 uppercase">
                    {m.file_type} · {courseTitleById[m.course_id] || `Course #${m.course_id}`}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    disabled={busyId === m.id}
                    onClick={() => handleReview(m.id, 'approve')}
                    className="btn-primary text-sm px-3 py-1.5"
                  >
                    <Check className="h-3.5 w-3.5" /> Approve
                  </button>
                  <button
                    disabled={busyId === m.id}
                    onClick={() => handleReview(m.id, 'reject')}
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

      <Card title="All courses">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink/50 border-b border-line">
                <th className="py-2 pr-4">Title</th>
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c.id} className="border-b border-line last:border-0">
                  <td className="py-2 pr-4">{c.title}</td>
                  <td className="py-2 pr-4 text-ink/70">{c.category}</td>
                  <td className="py-2 pr-4">
                    <StatusBadge status={c.status} />
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
