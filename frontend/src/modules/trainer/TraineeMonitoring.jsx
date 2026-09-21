import { useEffect, useState } from 'react'
import { Users, ShieldAlert, BookOpen } from 'lucide-react'
import Card from '../../components/Card'
import Loader from '../../components/Loader'
import EmptyState from '../../components/EmptyState'
import StatusBadge from '../../components/StatusBadge'
import * as trainerService from '../../services/trainerService'
import * as assessmentService from '../../services/assessmentService'

export default function TraineeMonitoring() {
  const [courses, setCourses] = useState([])
  const [courseId, setCourseId] = useState('')
  const [activeTab, setActiveTab] = useState('enrolled')
  
  const [trainees, setTrainees] = useState(null)
  
  const [questionnaires, setQuestionnaires] = useState([])
  const [questionnaireId, setQuestionnaireId] = useState('')
  const [attempts, setAttempts] = useState(null)

  const [requests, setRequests] = useState(null)

  useEffect(() => {
    trainerService.getMyCourses().then((data) => {
      setCourses(data)
      if (data.length) setCourseId(String(data[0].id))
    })
  }, [])

  useEffect(() => {
    if (!courseId) return
    if (activeTab === 'enrolled') {
      setTrainees(null)
      trainerService.getCourseTrainees(courseId).then(setTrainees)
    } else if (activeTab === 'requests') {
      setRequests(null)
      assessmentService.getPendingReattempts().then(setRequests)
    } else {
      assessmentService.getMyQuestionnaires(courseId).then((data) => {
        setQuestionnaires(data)
        setQuestionnaireId(data.length ? String(data[0].id) : '')
      })
    }
  }, [courseId, activeTab])

  useEffect(() => {
    if (activeTab !== 'assessments') return
    if (!questionnaireId) {
      setAttempts([])
      return
    }
    setAttempts(null)
    assessmentService.getQuestionnaireAttempts(questionnaireId).then(setAttempts)
  }, [questionnaireId, activeTab])

  const handleReviewRequest = async (requestId, action) => {
    try {
      await assessmentService.reviewReattempt(requestId, action)
      setRequests((prev) => prev.filter((r) => r.id !== requestId))
    } catch (err) {
      console.error(err)
    }
  }

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
          {activeTab === 'assessments' && (
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
          )}
        </div>
      </Card>
      
      <div className="flex gap-4 border-b border-line mb-4">
        <button
          onClick={() => setActiveTab('enrolled')}
          className={`pb-2 text-sm font-medium ${
            activeTab === 'enrolled' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-ink/60 hover:text-ink'
          }`}
        >
          Enrolled Trainees
        </button>
        <button
          onClick={() => setActiveTab('assessments')}
          className={`pb-2 text-sm font-medium ${
            activeTab === 'assessments' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-ink/60 hover:text-ink'
          }`}
        >
          Assessment Attempts
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`pb-2 text-sm font-medium ${
            activeTab === 'requests' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-ink/60 hover:text-ink'
          }`}
        >
          Re-attempt Requests
        </button>
      </div>

      {activeTab === 'enrolled' && (
        <Card title="Enrolled Trainees">
          {trainees === null ? (
            <Loader label="Loading trainees…" />
          ) : trainees.length === 0 ? (
            <EmptyState icon={Users} title="No trainees enrolled" description="No trainees are currently enrolled in this course." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-ink/50 border-b border-line">
                    <th className="py-2 pr-4">Trainee Name</th>
                    <th className="py-2 pr-4">Employee ID</th>
                    <th className="py-2 pr-4">Email</th>
                    <th className="py-2 pr-4">Enrolled At</th>
                  </tr>
                </thead>
                <tbody>
                  {trainees.map((t) => (
                    <tr key={t.id} className="border-b border-line last:border-0">
                      <td className="py-2 pr-4 font-medium">{t.trainee?.profile?.full_name || t.trainee?.email}</td>
                      <td className="py-2 pr-4">{t.trainee?.profile?.employee_id || '—'}</td>
                      <td className="py-2 pr-4">{t.trainee?.email}</td>
                      <td className="py-2 pr-4 text-ink/50">
                        {new Date(t.enrolled_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'assessments' && (
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
      )}


      {activeTab === 'requests' && (
        <Card title="Re-attempt Requests">
          {requests === null ? (
            <Loader label="Loading requests…" />
          ) : requests.length === 0 ? (
            <EmptyState icon={BookOpen} title="No pending requests" description="All caught up." />
          ) : (
            <div className="space-y-4">
              {requests.map((r) => (
                <div key={r.id} className="p-4 rounded border border-line flex flex-col md:flex-row gap-4 items-start md:items-center">
                  <div className="flex-1">
                    <p className="font-medium text-sm">Attempt ID: {r.attempt_id}</p>
                    <p className="text-sm text-ink/70 mt-1">Reason: {r.reason}</p>
                    <p className="text-xs text-ink/50 mt-2">Requested: {new Date(r.requested_at).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReviewRequest(r.id, 'approve')}
                      className="btn text-white bg-success-600 hover:bg-success-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReviewRequest(r.id, 'reject')}
                      className="btn text-white bg-error-600 hover:bg-error-700"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
