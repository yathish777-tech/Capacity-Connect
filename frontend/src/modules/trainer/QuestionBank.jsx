import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { ListChecks, Plus, Trash2 } from 'lucide-react'
import Card from '../../components/Card'
import Loader from '../../components/Loader'
import EmptyState from '../../components/EmptyState'
import Modal from '../../components/Modal'
import * as trainerService from '../../services/trainerService'
import * as assessmentService from '../../services/assessmentService'
import { apiErrorMessage } from '../../services/api'

const blankQuestion = () => ({
  question_text: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  correct_option: 'a',
  correct_options: ['a'],
  marks: 1,
})

export default function QuestionBank() {
  const [courses, setCourses] = useState([])
  const [courseId, setCourseId] = useState('')
  const [questionnaires, setQuestionnaires] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [title, setTitle] = useState('')
  const [deadline, setDeadline] = useState('')
  const [duration, setDuration] = useState(30)
  const [passingScore, setPassingScore] = useState(50)
  const [questions, setQuestions] = useState([blankQuestion()])

  useEffect(() => {
    trainerService.getMyCourses().then((data) => {
      setCourses(data)
      if (data.length) setCourseId(String(data[0].id))
    })
  }, [])

  useEffect(() => {
    if (!courseId) return
    setQuestionnaires(null)
    assessmentService.getMyQuestionnaires(courseId).then(setQuestionnaires)
  }, [courseId])

  function updateQuestion(index, field, value) {
    setQuestions((qs) => qs.map((q, i) => (i === index ? { ...q, [field]: value } : q)))
  }

  function toggleCorrectOption(index, letter) {
    setQuestions((qs) =>
      qs.map((q, i) => {
        if (i !== index) return q
        const current = q.correct_options || [q.correct_option || 'a']
        const next = current.includes(letter) ? current.filter((item) => item !== letter) : [...current, letter]
        const safeNext = next.length ? next : [letter]
        return { ...q, correct_options: safeNext, correct_option: safeNext[0] }
      })
    )
  }

  function resetForm() {
    setTitle('')
    setDeadline('')
    setDuration(30)
    setPassingScore(50)
    setQuestions([blankQuestion()])
  }

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const normalizedQuestions = questions.map((q) => ({
        ...q,
        correct_options: q.correct_options?.length ? q.correct_options : [q.correct_option],
        correct_option: (q.correct_options?.length ? q.correct_options[0] : q.correct_option) || 'a',
      }))
      await assessmentService.createQuestionnaire({
        course_id: Number(courseId),
        title,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        duration_minutes: Number(duration),
        passing_score_percent: Number(passingScore),
        questions: normalizedQuestions,
      })
      toast.success('Assessment created')
      setModalOpen(false)
      resetForm()
      assessmentService.getMyQuestionnaires(courseId).then(setQuestionnaires)
    } catch (err) {
      toast.error(apiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold">Question Bank</h1>
        <button disabled={!courseId} onClick={() => setModalOpen(true)} className="btn-primary text-sm">
          <Plus className="h-4 w-4" /> New assessment
        </button>
      </div>

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

      <Card title="Assessments for this course">
        {questionnaires === null ? (
          <Loader label="Loading…" />
        ) : questionnaires.length === 0 ? (
          <EmptyState icon={ListChecks} title="No assessments yet" description="Create one to get started." />
        ) : (
          <ul className="divide-y divide-line">
            {questionnaires.map((q) => (
              <li key={q.id} className="py-3">
                <p className="font-medium">{q.title}</p>
                <p className="text-sm text-ink/60">
                  {q.questions.length} questions · {q.duration_minutes} min · pass at {q.passing_score_percent}%
                  {q.deadline && ` · due ${new Date(q.deadline).toLocaleDateString()}`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New assessment" wide>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid md:grid-cols-3 gap-3">
            <div className="md:col-span-3">
              <label className="label">Title</label>
              <input required className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <label className="label">Deadline</label>
              <input type="datetime-local" className="input" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
            <div>
              <label className="label">Duration (min)</label>
              <input type="number" min={1} className="input" value={duration} onChange={(e) => setDuration(e.target.value)} />
            </div>
            <div>
              <label className="label">Passing score (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                className="input"
                value={passingScore}
                onChange={(e) => setPassingScore(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3">
            {questions.map((q, i) => (
              <div key={i} className="border border-line rounded p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Question {i + 1}</p>
                  {questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setQuestions((qs) => qs.filter((_, idx) => idx !== i))}
                      className="text-ink/40 hover:text-amber-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <input
                  required
                  placeholder="Question text"
                  className="input"
                  value={q.question_text}
                  onChange={(e) => updateQuestion(i, 'question_text', e.target.value)}
                />
                <div className="grid grid-cols-2 gap-2">
                  {['a', 'b', 'c', 'd'].map((letter) => (
                    <div key={letter} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={(q.correct_options || [q.correct_option]).includes(letter)}
                        onChange={() => toggleCorrectOption(i, letter)}
                      />
                      <input
                        required
                        placeholder={`Option ${letter.toUpperCase()}`}
                        className="input"
                        value={q[`option_${letter}`]}
                        onChange={(e) => updateQuestion(i, `option_${letter}`, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-ink/40">Tick one or more correct options. The trainee must select all correct options to get marks.</p>
              </div>
            ))}
          </div>

          <button type="button" onClick={() => setQuestions((qs) => [...qs, blankQuestion()])} className="btn-secondary text-sm">
            <Plus className="h-3.5 w-3.5" /> Add question
          </button>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : 'Create assessment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
