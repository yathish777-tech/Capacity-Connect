import { useEffect, useState } from 'react'
import { Users, ShieldAlert } from 'lucide-react'
import Card from '../../components/Card'
import Loader from '../../components/Loader'
import EmptyState from '../../components/EmptyState'
import StatusBadge from '../../components/StatusBadge'
import * as trainerService from '../../services/trainerService'
import * as assessmentService from '../../services/assessmentService'

export default function TraineeMonitoring() {
  const [courses, setCourses] = useState([])
  const [courseId, setCourseId] = useState('')
  const [questionnaires, setQuestionnaires] = useState([])
  const [questionnaireId, setQuestionnaireId] = useState('')
  const [attempts, setAttempts] = useState(null)

  useEffect(() => {
    trainerService.getMyCourses().then((data) => {
      setCourses(data)
      if (data.length) setCourseId(String(data[0].id))
    })
  }, [])

  useEffect(() => {
    if (!courseId) return
    assessmentService.getMyQuestionnaires(courseId).then((data) => {
      setQuestionnaires(data)
      setQuestionnaireId(data.length ? String(data[0].id) : '')
    })
  }, [courseId])

  useEffect(() => {
    if (!questionnaireId) {
      setAttempts([])
      return
    }
    setAttempts(null)
    assessmentService.getQuestionnaireAttempts(questionnaireId).then(setAttempts)
  }, [questionnaireId])

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-semibold">Trainee Monitoring</h1>

      <Card>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="label">Course</label>
            <select className="input" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Assessment</label>
            <select className="input" value={questionnaireId} onChange={(e) => setQuestionnaireId(e.target.value)}>
              {questionnaires.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <Card title="Attempts">
        {attempts === null ? (
          <Loader label="Loading attempts…" />
        ) : attempts.length === 0 ? (
          <EmptyState icon={Users} title="No attempts yet" description="Results will appear here once trainees take this assessment." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink/50 border-b border-line">
                  <th className="py-2 pr-4">Trainee</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Score</th>
                  <th className="py-2 pr-4">Violations</th>
                  <th className="py-2 pr-4">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((a) => (
                  <tr key={a.id} className="border-b border-line last:border-0">
                    <td className="py-2 pr-4">{a.trainee_name}</td>
                    <td className="py-2 pr-4">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="py-2 pr-4">{a.score != null ? `${a.score}/${a.total_marks}` : '—'}</td>
                    <td className="py-2 pr-4">
                      {a.violation_count > 0 ? (
                        <span className="flex items-center gap-1 text-amber-600">
                          <ShieldAlert className="h-3.5 w-3.5" /> {a.violation_count}
                        </span>
                      ) : (
                        '0'
                      )}
                    </td>
                    <td className="py-2 pr-4 text-ink/50">
                      {a.submitted_at ? new Date(a.submitted_at).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
