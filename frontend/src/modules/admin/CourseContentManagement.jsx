import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Archive, BookOpen, Check, Plus, Trash2, Upload, X } from 'lucide-react'
import Card from '../../components/Card'
import EmptyState from '../../components/EmptyState'
import MaterialList from '../../components/materials/MaterialList'
import MaterialViewer from '../../components/materials/MaterialViewer'
import StatusBadge from '../../components/StatusBadge'
import * as adminService from '../../services/adminService'
import { apiErrorMessage } from '../../services/api'
import { t } from '../../i18n'

const emptyCourse = { title: '', description: '', category: '', duration_hours: 1, subject_tag_names: '' }

export default function CourseContentManagement() {
  const [courses, setCourses] = useState([])
  const [activeCourseId, setActiveCourseId] = useState('')
  const [tab, setTab] = useState('details')
  const [form, setForm] = useState(emptyCourse)
  const [materials, setMaterials] = useState(null)
  const [selectedMaterial, setSelectedMaterial] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [upload, setUpload] = useState({ title: '', fileType: 'pdf', file: null })
  const replaceInputRef = useRef(null)
  const [replaceTarget, setReplaceTarget] = useState(null)

  const activeCourse = useMemo(() => courses.find((course) => String(course.id) === String(activeCourseId)), [courses, activeCourseId])

  function loadCourses(nextActiveId) {
    adminService.getAdminCourses().then((data) => {
      setCourses(data)
      const id = nextActiveId || activeCourseId || data[0]?.id || ''
      setActiveCourseId(id ? String(id) : '')
    })
  }

  function loadMaterials(id = activeCourseId) {
    if (!id) return
    setMaterials(null)
    adminService.getAdminCourseMaterials(id).then(setMaterials).catch((err) => toast.error(apiErrorMessage(err)))
  }

  useEffect(() => loadCourses(), [])
  useEffect(() => {
    if (activeCourse) {
      setForm({
        title: activeCourse.title || '',
        description: activeCourse.description || '',
        category: activeCourse.category || '',
        duration_hours: activeCourse.duration_hours || 1,
        subject_tag_names: activeCourse.subject_tag_names?.join(', ') || '',
      })
      loadMaterials(activeCourse.id)
    }
  }, [activeCourseId])

  async function saveCourse(e) {
    e.preventDefault()
    const payload = {
      ...form,
      duration_hours: Number(form.duration_hours) || 1,
      subject_tag_names: form.subject_tag_names.split(',').map((tag) => tag.trim()).filter(Boolean),
    }
    try {
      if (activeCourse) {
        await adminService.updateCourse(activeCourse.id, payload)
        toast.success(t('admin.courseContent.courseUpdated'))
        loadCourses(activeCourse.id)
      } else {
        const created = await adminService.createCourse(payload)
        toast.success(t('admin.courseContent.courseCreated'))
        setForm(emptyCourse)
        loadCourses(created.id)
      }
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  async function archiveCourse() {
    if (!activeCourse) return
    try {
      await adminService.archiveCourse(activeCourse.id)
      toast.success(t('admin.courseContent.courseArchived'))
      loadCourses(activeCourse.id)
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  async function deleteCourse() {
    if (!activeCourse || !window.confirm(`Delete "${activeCourse.title}"?`)) return
    try {
      await adminService.deleteCourse(activeCourse.id)
      toast.success(t('admin.courseContent.courseDeleted'))
      setActiveCourseId('')
      loadCourses('')
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  async function reviewMaterial(material, action) {
    const remark = action === 'reject' ? window.prompt(`${t('common.remark')}:`) : ''
    if (action === 'reject' && remark === null) return
    setBusyId(material.id)
    try {
      await adminService.reviewMaterial(material.id, action, remark)
      toast.success(action === 'approve' ? t('admin.courseContent.materialApproved') : t('admin.courseContent.materialRejected'))
      loadMaterials()
    } catch (err) {
      toast.error(apiErrorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  async function uploadMaterial(e) {
    e.preventDefault()
    if (!activeCourse || !upload.file) return
    try {
      await adminService.uploadAdminMaterial(activeCourse.id, upload)
      toast.success(t('admin.courseContent.materialUploaded'))
      setUpload({ title: '', fileType: 'pdf', file: null })
      e.target.reset()
      loadMaterials()
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  async function downloadMaterial(material) {
    try {
      const info = await adminService.getAdminMaterialUrl(material.id)
      window.open(info.url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      toast.error(apiErrorMessage(err))
    }
  }

  function startReplace(material) {
    setReplaceTarget(material)
    replaceInputRef.current?.click()
  }

  async function handleReplaceFile(e) {
    const replacement = e.target.files?.[0]
    e.target.value = ''
    if (!replacement || !replaceTarget) return
    setBusyId(replaceTarget.id)
    try {
      await adminService.replaceAdminMaterial(replaceTarget.course_id, replaceTarget.id, {
        title: replaceTarget.title,
        fileType: replaceTarget.file_type,
        file: replacement,
      })
      toast.success(t('admin.courseContent.materialReplaced'))
      loadMaterials()
    } catch (err) {
      toast.error(apiErrorMessage(err))
    } finally {
      setBusyId(null)
      setReplaceTarget(null)
    }
  }

  async function deleteMaterial(material) {
    if (!window.confirm(`Delete "${material.title}"?`)) return
    setBusyId(material.id)
    try {
      await adminService.deleteAdminMaterial(material.course_id, material.id)
      toast.success(t('admin.courseContent.materialDeleted'))
      loadMaterials()
    } catch (err) {
      toast.error(apiErrorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-xl font-semibold">{t('admin.courseContent.title')}</h1>
        <button onClick={() => { setActiveCourseId(''); setForm(emptyCourse); setTab('details') }} className="btn-primary text-sm">
          <Plus className="h-4 w-4" /> {t('admin.courseContent.createCourse')}
        </button>
      </div>

      <div className="grid lg:grid-cols-[320px_1fr] gap-4">
        <Card>
          {courses.length === 0 ? (
            <EmptyState icon={BookOpen} title="No courses yet" />
          ) : (
            <div className="space-y-2">
              {courses.map((course) => (
                <button key={course.id} onClick={() => setActiveCourseId(String(course.id))} className={`w-full text-left rounded border px-3 py-2 ${String(activeCourseId) === String(course.id) ? 'border-teal-600 bg-teal-50' : 'border-line bg-white hover:bg-ink/5'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{course.title}</span>
                    <StatusBadge status={course.status} />
                  </div>
                  <p className="text-xs text-ink/60 mt-1">{course.subject_tag_names?.join(', ') || course.category}</p>
                  {course.assigned_trainer_name && <p className="text-xs text-ink/50 mt-1">{course.assigned_trainer_name}</p>}
                </button>
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <div className="inline-flex rounded border border-line overflow-hidden">
            <button onClick={() => setTab('details')} className={`px-3 py-2 text-sm ${tab === 'details' ? 'bg-teal-600 text-white' : 'bg-white'}`}>{t('admin.courseContent.details')}</button>
            <button disabled={!activeCourse} onClick={() => setTab('content')} className={`px-3 py-2 text-sm ${tab === 'content' ? 'bg-teal-600 text-white' : 'bg-white'}`}>{t('admin.courseContent.content')}</button>
          </div>

          {tab === 'details' ? (
            <Card title={activeCourse ? t('admin.courseContent.editCourse') : t('admin.courseContent.createCourse')}>
              <form onSubmit={saveCourse} className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="label">{t('common.title')}</label>
                  <input required className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div>
                  <label className="label">{t('common.category')}</label>
                  <input className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                </div>
                <div>
                  <label className="label">{t('common.durationHours')}</label>
                  <input type="number" min="1" className="input" value={form.duration_hours} onChange={(e) => setForm({ ...form, duration_hours: e.target.value })} />
                </div>
                <div>
                  <label className="label">{t('common.subjectTags')}</label>
                  <input className="input" value={form.subject_tag_names} onChange={(e) => setForm({ ...form, subject_tag_names: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <label className="label">{t('common.description')}</label>
                  <textarea className="input min-h-24" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="md:col-span-2 flex flex-wrap gap-2">
                  <button type="submit" className="btn-primary text-sm"><Check className="h-4 w-4" /> {t('common.save')}</button>
                  {activeCourse && <button type="button" onClick={archiveCourse} className="btn-secondary text-sm"><Archive className="h-4 w-4" /> {t('common.archive')}</button>}
                  {activeCourse && <button type="button" onClick={deleteCourse} className="btn-secondary text-sm"><Trash2 className="h-4 w-4" /> {t('common.delete')}</button>}
                </div>
              </form>
            </Card>
          ) : activeCourse ? (
            <>
              <Card title={t('admin.courseContent.uploadMaterial')}>
                <form onSubmit={uploadMaterial} className="grid md:grid-cols-[1fr_160px_1fr_auto] gap-3 items-end">
                  <div>
                    <label className="label">{t('common.title')}</label>
                    <input required className="input" value={upload.title} onChange={(e) => setUpload({ ...upload, title: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">{t('common.type')}</label>
                    <select className="input" value={upload.fileType} onChange={(e) => setUpload({ ...upload, fileType: e.target.value })}>
                      <option value="pdf">PDF</option>
                      <option value="ppt">PPT</option>
                      <option value="video">Video</option>
                      <option value="document">Document</option>
                    </select>
                  </div>
                  <input required type="file" className="input" onChange={(e) => setUpload({ ...upload, file: e.target.files?.[0] })} />
                  <button className="btn-primary text-sm"><Upload className="h-4 w-4" /> {t('common.upload')}</button>
                </form>
              </Card>
              <Card title="Course materials">
                <MaterialList
                  materials={materials}
                  onView={setSelectedMaterial}
                  onDownload={downloadMaterial}
                  onReplace={startReplace}
                  onDelete={deleteMaterial}
                  busyId={busyId}
                />
                <div className="mt-4 flex flex-wrap gap-2">
                  {materials?.filter((m) => m.status === 'pending').map((material) => (
                    <div key={material.id} className="flex items-center gap-2 rounded border border-line px-3 py-2 text-sm">
                      <span>{material.title}</span>
                      <button disabled={busyId === material.id} onClick={() => reviewMaterial(material, 'approve')} className="btn-primary text-xs px-2 py-1"><Check className="h-3 w-3" /> {t('common.approve')}</button>
                      <button disabled={busyId === material.id} onClick={() => reviewMaterial(material, 'reject')} className="btn-secondary text-xs px-2 py-1"><X className="h-3 w-3" /> {t('common.reject')}</button>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          ) : (
            <Card><EmptyState title={t('admin.courseContent.noCourse')} /></Card>
          )}
        </div>
      </div>

      <input ref={replaceInputRef} type="file" className="hidden" onChange={handleReplaceFile} />
      <MaterialViewer open={Boolean(selectedMaterial)} material={selectedMaterial} onClose={() => setSelectedMaterial(null)} getUrl={(material) => adminService.getAdminMaterialUrl(material.id)} />
    </div>
  )
}
