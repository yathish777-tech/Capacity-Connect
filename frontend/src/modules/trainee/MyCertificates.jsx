import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Award, Download } from 'lucide-react'
import Card from '../../components/Card'
import EmptyState from '../../components/EmptyState'
import Loader from '../../components/Loader'
import StatusBadge from '../../components/StatusBadge'
import * as traineeService from '../../services/traineeService'
import * as certificateService from '../../services/certificateService'
import { apiErrorMessage } from '../../services/api'
import { t } from '../../i18n'

export default function MyCertificates() {
  const [enrollments, setEnrollments] = useState(null)
  const [certificates, setCertificates] = useState(null)
  const [busyId, setBusyId] = useState(null)

  function refresh() {
    traineeService.getMyEnrollments().then(setEnrollments)
    certificateService.getMyCertificates().then(setCertificates)
  }

  useEffect(refresh, [])

  async function requestCertificate(courseId) {
    setBusyId(courseId)
    try {
      await certificateService.requestCertificate(courseId)
      toast.success('Certificate requested')
      refresh()
    } catch (err) {
      toast.error(apiErrorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  async function download(id) {
    setBusyId(id)
    try {
      await certificateService.downloadCertificate(id)
    } catch (err) {
      toast.error(apiErrorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  if (!enrollments || !certificates) return <Loader label="Loading certificates..." />

  const latestByCourse = new Map(certificates.map((certificate) => [certificate.course_id, certificate]))
  const rows = enrollments.map((enrollment) => ({
    enrollment,
    certificate: latestByCourse.get(enrollment.course_id),
  }))

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-semibold">{t('trainee.certificates.title')}</h1>
      <Card>
        {rows.length === 0 ? (
          <EmptyState icon={Award} title={t('trainee.certificates.none')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink/50 border-b border-line">
                  <th className="py-2 pr-4">Course</th>
                  <th className="py-2 pr-4">Completion</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ enrollment, certificate }) => {
                  const completed = enrollment.status === 'completed'
                  const hasTemplate = enrollment.course?.has_certificate_template
                  const canRequest = completed && hasTemplate && (!certificate || certificate.status === 'rejected')
                  return (
                    <tr key={enrollment.id} className="border-b border-line last:border-0 align-top">
                      <td className="py-3 pr-4 font-medium">{enrollment.course?.title}</td>
                      <td className="py-3 pr-4 text-ink/70">
                        <p>{completed ? 'Completed' : 'In progress'} | {enrollment.progress_percent ?? 0}%</p>
                        {enrollment.completed_at && <p>{new Date(enrollment.completed_at).toLocaleDateString()}</p>}
                      </td>
                      <td className="py-3 pr-4">
                        {certificate ? (
                          <>
                            <StatusBadge status={certificate.status} />
                            {certificate.remark && <p className="text-xs text-red-700 mt-1">{certificate.remark}</p>}
                            {certificate.certificate_no && <p className="text-xs text-ink/60 mt-1">No. {certificate.certificate_no}</p>}
                          </>
                        ) : (
                          <span className="text-ink/50">Not requested</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex justify-end gap-2">
                          {certificate?.status === 'approved' ? (
                            <button disabled={busyId === certificate.id} onClick={() => download(certificate.id)} className="btn-primary text-xs px-2.5 py-1">
                              <Download className="h-3.5 w-3.5" /> {t('trainee.certificates.download')}
                            </button>
                          ) : (
                            <button disabled={!canRequest || busyId === enrollment.course_id} onClick={() => requestCertificate(enrollment.course_id)} className="btn-primary text-xs px-2.5 py-1">
                              {!completed ? t('trainee.certificates.completeFirst') : !hasTemplate ? t('trainee.certificates.templateUnavailable') : t('trainee.certificates.request')}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
