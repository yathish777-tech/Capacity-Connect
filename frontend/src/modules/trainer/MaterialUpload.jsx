import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { UploadCloud } from 'lucide-react'
import Card from '../../components/Card'
import MaterialList from '../../components/materials/MaterialList'
import MaterialViewer from '../../components/materials/MaterialViewer'
import * as trainerService from '../../services/trainerService'
import { apiErrorMessage } from '../../services/api'

const FILE_TYPES = ['pdf', 'ppt', 'video', 'document']

export default function MaterialUpload() {
  const [courses, setCourses] = useState([])
  const [courseId, setCourseId] = useState('')
  const [materials, setMaterials] = useState(null)
  const [title, setTitle] = useState('')
  const [fileType, setFileType] = useState('pdf')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [selectedMaterial, setSelectedMaterial] = useState(null)
  const [replaceTarget, setReplaceTarget] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const replaceInputRef = useRef(null)

  useEffect(() => {
    trainerService.getMyCourses().then((data) => {
      setCourses(data)
      if (data.length) setCourseId(String(data[0].id))
    })
  }, [])

  function refreshMaterials(id) {
    setMaterials(null)
    trainerService.getMyCourseMaterials(id).then(setMaterials)
  }

  useEffect(() => {
    if (courseId) refreshMaterials(courseId)
  }, [courseId])

  async function handleUpload(e) {
    e.preventDefault()
    if (!file) return toast.error('Choose a file first')
    setUploading(true)
    try {
      await trainerService.uploadMaterial(courseId, { title, fileType, file })
      toast.success('Uploaded - awaiting Admin approval before it goes live')
      setTitle('')
      setFile(null)
      e.target.reset()
      refreshMaterials(courseId)
    } catch (err) {
      toast.error(apiErrorMessage(err))
    } finally {
      setUploading(false)
    }
  }

  async function downloadMaterial(material) {
    try {
      const info = await trainerService.getMyCourseMaterialUrl(material.course_id, material.id)
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
      await trainerService.replaceMaterial(replaceTarget.course_id, replaceTarget.id, {
        title: replaceTarget.title,
        fileType: replaceTarget.file_type,
        file: replacement,
      })
      toast.success('Material replaced - awaiting Admin approval')
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
      await trainerService.deleteMaterial(material.course_id, material.id)
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
      <h1 className="font-display text-xl font-semibold">Material Upload</h1>

      <Card>
        <label className="label">Course</label>
        <select className="input max-w-sm" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </Card>

      <Card title="Upload new material">
        <form onSubmit={handleUpload} className="grid items-end gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="label">Title</label>
            <input required className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={fileType} onChange={(e) => setFileType(e.target.value)}>
              {FILE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">File</label>
            <input required type="file" className="input" onChange={(e) => setFile(e.target.files[0])} />
          </div>
          <div className="md:col-span-4">
            <button type="submit" disabled={uploading || !courseId} className="btn-primary">
              <UploadCloud className="h-4 w-4" /> {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </Card>

      <Card title="My uploads">
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
        getUrl={(material) => trainerService.getMyCourseMaterialUrl(material.course_id, material.id)}
      />
    </div>
  )
}
