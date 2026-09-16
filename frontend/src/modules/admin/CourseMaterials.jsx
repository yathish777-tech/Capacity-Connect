import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import Card from '../../components/Card'
import MaterialList from '../../components/materials/MaterialList'
import MaterialViewer from '../../components/materials/MaterialViewer'
import * as adminService from '../../services/adminService'
import { apiErrorMessage } from '../../services/api'

export default function CourseMaterials() {
  const [courses, setCourses] = useState([])
  const [courseId, setCourseId] = useState('')
  const [materials, setMaterials] = useState(null)
  const [selectedMaterial, setSelectedMaterial] = useState(null)
  const [replaceTarget, setReplaceTarget] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const replaceInputRef = useRef(null)

  useEffect(() => {
    adminService.getAdminCourses().then((data) => {
      setCourses(data)
      if (data.length) setCourseId(String(data[0].id))
    })
  }, [])

  function refreshMaterials(id) {
    if (!id) return
    setMaterials(null)
    adminService.getAdminCourseMaterials(id).then(setMaterials)
  }

  useEffect(() => {
    refreshMaterials(courseId)
  }, [courseId])

  async function downloadMaterial(material) {
    try {
      const info = await adminService.getAdminMaterialUrl(material.id)
      window.open(info.url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      toast.error(apiErrorMessage(err) || 'Unable to load this material. Please try again.')
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
      toast.success('Material replaced')
      refreshMaterials(courseId)
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
      toast.success('Material deleted')
      refreshMaterials(courseId)
    } catch (err) {
      toast.error(apiErrorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-semibold">Content Management</h1>

      <Card>
        <label className="label">Course</label>
        <select className="input max-w-sm" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title}
            </option>
          ))}
        </select>
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
      </Card>

      <input ref={replaceInputRef} type="file" className="hidden" onChange={handleReplaceFile} />
      <MaterialViewer
        open={Boolean(selectedMaterial)}
        material={selectedMaterial}
        onClose={() => setSelectedMaterial(null)}
        getUrl={(material) => adminService.getAdminMaterialUrl(material.id)}
      />
    </div>
  )
}
