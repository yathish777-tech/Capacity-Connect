import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Award } from 'lucide-react'
import Card from '../../components/Card'
import Loader from '../../components/Loader'
import EmptyState from '../../components/EmptyState'
import StatusBadge from '../../components/StatusBadge'
import * as traineeService from '../../services/traineeService'
import * as certificateService from '../../services/certificateService'
import { apiErrorMessage } from '../../services/api'

export default function CertificateRequest() {
  const [enrollments, setEnrollments] = useState(null)
  const [certificates, setCertificates] = useState(null)
  const [busyCourseId, setBusyCourseId] = useState(null)

  function refresh() {
    traineeService.getMyEnrollments().then(setEnrollments)
    certificateService.getMyCertificates().then(setCertificates)
  }

  useEffect(refresh, [])

  async function handleRequest(courseId) {
    setBusyCourseId(courseId)
    try {
      await certificateService.requestCertificate(courseId)
      toast.success('Certificate requested — Admin will review your result')
      refresh()
    } catch (err) {
      toast.error(apiErrorMessage(err))
    } finally {
      setBusyCourseId(null)
    }
  }

  if (!enrollments || !certificates) return <Loader label="Loading…" />

  const requestedCourseIds = new Set(certificates.map((c) => c.course_id))
  const completedNotRequested = enrollments.filter((e) => e.status === 'completed' && !requestedCourseIds.has(e.course_id))

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-semibold">Certificates</h1>

      <Card title="Eligible for a certificate">
        {completedNotRequested.length === 0 ? (
          <EmptyState title="Nothing to request right now" description="Pass a course's assessment to become eligible." />
        ) : (
          <ul className="divide-y divide-line">
            {completedNotRequested.map((e) => (
              <li key={e.id} className="py-3 flex items-center justify-between">
                <p className="font-medium">{e.course.title}</p>
                <button
                  disabled={busyCourseId === e.course_id}
                  onClick={() => handleRequest(e.course_id)}
                  className="btn-primary text-sm px-3 py-1.5"
                >
                  Request certificate
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="My certificates">
        {certificates.length === 0 ? (
          <EmptyState icon={Award} title="No certificate requests yet" />
        ) : (
          <ul className="divide-y divide-line">
            {certificates.map((c) => (
              <li key={c.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">Course #{c.course_id}</p>
                  {c.certificate_number && <p className="text-sm text-ink/60">No. {c.certificate_number}</p>}
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
