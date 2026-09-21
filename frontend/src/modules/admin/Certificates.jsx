import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Award, Check, Upload, X } from 'lucide-react'
import Card from '../../components/Card'
import EmptyState from '../../components/EmptyState'
import Loader from '../../components/Loader'
import StatusBadge from '../../components/StatusBadge'
import * as adminService from '../../services/adminService'
import { apiErrorMessage } from '../../services/api'
import { t } from '../../i18n'

export default function Certificates() {
  const [tab, setTab] = useState('templates')
  const [courses, setCourses] = useState([])
  const [courseId, setCourseId] = useState('')
  const [template, setTemplate] = useState(null)
  const [templateLoading, setTemplateLoading] = useState(false)
  const [position, setPosition] = useState({ x: 120, y: 320, fontSize: 28 })
  const [file, setFile] = useState(null)
  const [requests, setRequests] = useState(null)
  const [status, setStatus] = useState('pending')
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    adminService.getAdminCourses().then((data) => {
      setCourses(data)
      if (data.length) setCourseId(String(data[0].id))
    })
  }, [])

  useEffect(() => {
    if (!courseId) return
    setTemplateLoading(true)
    adminService.getCertificateTemplate(courseId)
      .then((data) => {
        setTemplate(data)
        setPosition({
          x: data.name_position?.x ?? 120,
          y: data.name_position?.y ?? 320,
          fontSize: data.name_position?.font_size ?? 28,
        })
      })
      .catch(() => setTemplate(null))
      .finally(() => setTemplateLoading(false))
  }, [courseId])

  function loadRequests() {
    setRequests(null)
    adminService.getCertificateRequests({ status }).then(setRequests).catch((err) => toast.error(apiErrorMessage(err)))
  }

  useEffect(loadRequests, [status])

  async function uploadTemplate(e) {
    e.preventDefault()
    if (!courseId || !file) return
    try {
      const data = await adminService.uploadCertificateTemplate(courseId, { file, ...position })
      setTemplate(data)
      setFile(null)
      e.target.reset()
      toast.success('Certificate template saved')
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  async function deleteTemplate() {
    try {
      await adminService.deleteCertificateTemplate(courseId)
      setTemplate(null)
      toast.success('Certificate template deleted')
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  async function review(request, action) {
    const remark = window.prompt(`${t('common.remark')}:`) || ''
    setBusyId(request.id)
    try {
      if (action === 'approve') await adminService.approveCertificateRequest(request.id, remark)
      else await adminService.rejectCertificateRequest(request.id, remark)
      toast.success(action === 'approve' ? 'Certificate approved and generated' : 'Certificate request rejected')
      loadRequests()
    } catch (err) {
      toast.error(apiErrorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-semibold">{t('admin.certificates.title')}</h1>
      <div className="inline-flex rounded border border-line overflow-hidden">
        <button onClick={() => setTab('templates')} className={`px-3 py-2 text-sm ${tab === 'templates' ? 'bg-teal-600 text-white' : 'bg-white'}`}>{t('admin.certificates.templates')}</button>
        <button onClick={() => setTab('requests')} className={`px-3 py-2 text-sm ${tab === 'requests' ? 'bg-teal-600 text-white' : 'bg-white'}`}>{t('admin.certificates.requests')}</button>
      </div>

      {tab === 'templates' ? (
        <div className="grid lg:grid-cols-[360px_1fr] gap-4">
          <Card title={t('admin.certificates.uploadTemplate')}>
            <form onSubmit={uploadTemplate} className="space-y-3">
              <div>
                <label className="label">Course</label>
                <select className="input" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                  {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="label">X</label>
                  <input type="number" className="input" value={position.x} onChange={(e) => setPosition({ ...position, x: e.target.value })} />
                </div>
                <div>
                  <label className="label">Y</label>
                  <input type="number" className="input" value={position.y} onChange={(e) => setPosition({ ...position, y: e.target.value })} />
                </div>
                <div>
                  <label className="label">Font</label>
                  <input type="number" className="input" value={position.fontSize} onChange={(e) => setPosition({ ...position, fontSize: e.target.value })} />
                </div>
              </div>
              <input required type="file" accept=".pdf,.png,.jpg,.jpeg" className="input" onChange={(e) => setFile(e.target.files?.[0])} />
              <div className="flex gap-2">
                <button className="btn-primary text-sm"><Upload className="h-4 w-4" /> {t('common.save')}</button>
                {template && <button type="button" onClick={deleteTemplate} className="btn-secondary text-sm">{t('common.delete')}</button>}
              </div>
              <p className="text-xs text-ink/50">One template per course. Re-uploading replaces the current template. Max 5 MB.</p>
            </form>
          </Card>

          <Card title={t('common.preview')}>
            {templateLoading ? (
              <Loader label="Loading template..." />
            ) : !template ? (
              <EmptyState icon={Award} title="No template uploaded for this course" />
            ) : (
              <div className="space-y-3">
                {template.preview_url ? (
                  template.file_type === 'pdf' ? (
                    <iframe title="Certificate template" src={template.preview_url} className="w-full h-[520px] rounded border border-line" />
                  ) : (
                    <img alt="Certificate template" src={template.preview_url} className="max-h-[520px] w-full object-contain rounded border border-line" />
                  )
                ) : (
                  <EmptyState title="Preview unavailable until storage can sign this file" />
                )}
                <p className="text-sm text-ink/60">{t('admin.certificates.namePosition')}: x {template.name_position?.x}, y {template.name_position?.y}, font {template.name_position?.font_size}</p>
              </div>
            )}
          </Card>
        </div>
      ) : (
        <Card>
          <div className="mb-4">
            <select className="input w-48" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="pending">{t('common.pending')}</option>
              <option value="approved">{t('common.approved')}</option>
              <option value="rejected">{t('common.rejected')}</option>
              <option value="all">{t('common.all')}</option>
            </select>
          </div>
          {requests === null ? (
            <Loader label="Loading certificate requests..." />
          ) : requests.length === 0 ? (
            <EmptyState icon={Award} title="No certificate requests found" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-ink/50 border-b border-line">
                    <th className="py-2 pr-4">Trainee</th>
                    <th className="py-2 pr-4">Course</th>
                    <th className="py-2 pr-4">Participation</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => (
                    <tr key={request.id} className="border-b border-line last:border-0 align-top">
                      <td className="py-3 pr-4">{request.trainee_name || `Trainee #${request.trainee_id}`}</td>
                      <td className="py-3 pr-4">{request.course_title || `Course #${request.course_id}`}</td>
                      <td className="py-3 pr-4 text-ink/70">
                        <p>Enrolled: {request.enrolled_at ? new Date(request.enrolled_at).toLocaleDateString() : '-'}</p>
                        <p>Completed: {request.completion_date ? new Date(request.completion_date).toLocaleDateString() : '-'}</p>
                        <p>Progress: {request.progress_percent ?? 0}% | Score: {request.assessment_score ?? '-'}</p>
                        <p>Exam violations: {request.violation_count}</p>
                        {request.remark && <p className="text-red-700">Remark: {request.remark}</p>}
                      </td>
                      <td className="py-3 pr-4"><StatusBadge status={request.status} /></td>
                      <td className="py-3 pr-4">
                        <div className="flex justify-end gap-2">
                          <button disabled={busyId === request.id || request.status !== 'pending'} onClick={() => review(request, 'approve')} className="btn-primary text-xs px-2.5 py-1"><Check className="h-3.5 w-3.5" /> {t('common.approve')}</button>
                          <button disabled={busyId === request.id || request.status !== 'pending'} onClick={() => review(request, 'reject')} className="btn-secondary text-xs px-2.5 py-1"><X className="h-3.5 w-3.5" /> {t('common.reject')}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
