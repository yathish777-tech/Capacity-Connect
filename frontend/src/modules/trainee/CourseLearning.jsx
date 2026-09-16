import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FileText, ListChecks } from 'lucide-react'
import Card from '../../components/Card'
import Loader from '../../components/Loader'
import EmptyState from '../../components/EmptyState'
import MaterialList from '../../components/materials/MaterialList'
import MaterialViewer from '../../components/materials/MaterialViewer'
import * as courseService from '../../services/courseService'
import * as assessmentService from '../../services/assessmentService'

export default function CourseLearning() {
  const { courseId } = useParams()
  const [course, setCourse] = useState(null)
  const [materials, setMaterials] = useState(null)
  const [questionnaires, setQuestionnaires] = useState(null)
  const [selectedMaterial, setSelectedMaterial] = useState(null)

  useEffect(() => {
    courseService.getCourse(courseId).then(setCourse)
    courseService.getCourseMaterials(courseId).then(setMaterials)
    assessmentService.getAvailableQuestionnaires(courseId).then(setQuestionnaires)
  }, [courseId])

  async function downloadMaterial(material) {
    const info = await courseService.getCourseMaterialUrl(courseId, material.id)
    window.open(info.url, '_blank', 'noopener,noreferrer')
  }

  if (!course) return <Loader label="Loading course..." />

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl font-semibold">{course.title}</h1>
        <p className="text-sm text-ink/60">{course.description}</p>
      </div>

      <Card title="Learning materials">
        {materials === null ? (
          <Loader label="Loading materials..." />
        ) : materials.length === 0 ? (
          <EmptyState icon={FileText} title="No approved materials yet" description="Your trainer's uploads will appear here once Admin approves them." />
        ) : (
          <MaterialList materials={materials} onView={setSelectedMaterial} onDownload={downloadMaterial} />
        )}
      </Card>

      <Card title="Assessments">
        {questionnaires === null ? (
          <Loader label="Loading assessments..." />
        ) : questionnaires.length === 0 ? (
          <EmptyState icon={ListChecks} title="No assessments published yet" />
        ) : (
          <ul className="divide-y divide-line">
            {questionnaires.map((q) => (
              <li key={q.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">{q.title}</p>
                  <p className="text-sm text-ink/60">
                    {q.question_count} questions - {q.duration_minutes} min
                    {q.deadline && ` - due ${new Date(q.deadline).toLocaleDateString()}`}
                  </p>
                </div>
                <Link to={`/trainee/assessment/${q.id}`} className="btn-primary text-sm">
                  Start
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <MaterialViewer
        open={Boolean(selectedMaterial)}
        material={selectedMaterial}
        onClose={() => setSelectedMaterial(null)}
        getUrl={(material) => courseService.getCourseMaterialUrl(courseId, material.id)}
      />
    </div>
  )
}
