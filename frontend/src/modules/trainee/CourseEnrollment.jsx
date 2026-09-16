import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { BookOpen, ArrowRight } from 'lucide-react'
import Card from '../../components/Card'
import Loader from '../../components/Loader'
import EmptyState from '../../components/EmptyState'
import * as courseService from '../../services/courseService'
import * as traineeService from '../../services/traineeService'
import { apiErrorMessage } from '../../services/api'

export default function CourseEnrollment() {
  const [courses, setCourses] = useState(null)
  const [enrolledIds, setEnrolledIds] = useState(new Set())
  const [busyId, setBusyId] = useState(null)

  function refresh() {
    courseService.getPublishedCourses().then(setCourses)
    traineeService.getMyEnrollments().then((data) => setEnrolledIds(new Set(data.map((e) => e.course_id))))
  }

  useEffect(refresh, [])

  async function handleEnroll(courseId) {
    setBusyId(courseId)
    try {
      await traineeService.enrollInCourse(courseId)
      toast.success('Enrolled!')
      refresh()
    } catch (err) {
      toast.error(apiErrorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  if (!courses) return <Loader label="Loading courses…" />

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-semibold">Courses</h1>

      {courses.length === 0 ? (
        <Card>
          <EmptyState icon={BookOpen} title="No courses published yet" description="Check back once Admin publishes a course." />
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {courses.map((c) => {
            const enrolled = enrolledIds.has(c.id)
            return (
              <Card key={c.id}>
                <p className="font-display font-semibold">{c.title}</p>
                <p className="text-xs text-ink/50 uppercase mt-0.5">{c.category}</p>
                <p className="text-sm text-ink/70 mt-2">{c.description}</p>
                <p className="text-xs text-ink/40 mt-2">{c.duration_hours}h</p>
                <div className="mt-4">
                  {enrolled ? (
                    <Link to={`/trainee/learning/${c.id}`} className="btn-secondary text-sm">
                      Go to course <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  ) : (
                    <button disabled={busyId === c.id} onClick={() => handleEnroll(c.id)} className="btn-primary text-sm">
                      {busyId === c.id ? 'Enrolling…' : 'Enroll'}
                    </button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
