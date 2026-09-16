import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Star } from 'lucide-react'
import Card from '../../components/Card'
import Loader from '../../components/Loader'
import EmptyState from '../../components/EmptyState'
import * as traineeService from '../../services/traineeService'
import { apiErrorMessage } from '../../services/api'

export default function Feedback() {
  const [enrollments, setEnrollments] = useState(null)
  const [courseId, setCourseId] = useState('')
  const [rating, setRating] = useState(5)
  const [comments, setComments] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    traineeService.getMyEnrollments().then((data) => {
      setEnrollments(data)
      if (data.length) setCourseId(String(data[0].course_id))
    })
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await traineeService.submitFeedback(Number(courseId), rating, comments)
      toast.success('Thanks for the feedback!')
      setComments('')
      setRating(5)
    } catch (err) {
      toast.error(apiErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (!enrollments) return <Loader label="Loading…" />

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-semibold">Feedback</h1>
      <Card>
        {enrollments.length === 0 ? (
          <EmptyState title="Enroll in a course first" description="You can leave feedback once you're enrolled in a course." />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
            <div>
              <label className="label">Course</label>
              <select className="input" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                {enrollments.map((e) => (
                  <option key={e.course_id} value={e.course_id}>
                    {e.course.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Rating</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button type="button" key={n} onClick={() => setRating(n)}>
                    <Star className={`h-6 w-6 ${n <= rating ? 'fill-amber-500 text-amber-500' : 'text-line'}`} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Comments</label>
              <textarea rows={4} className="input" value={comments} onChange={(e) => setComments(e.target.value)} />
            </div>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Submitting…' : 'Submit feedback'}
            </button>
          </form>
        )}
      </Card>
    </div>
  )
}
