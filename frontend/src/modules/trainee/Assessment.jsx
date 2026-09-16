import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ShieldAlert, Maximize, Clock, CheckCircle2, XCircle } from 'lucide-react'
import Loader from '../../components/Loader'
import * as assessmentService from '../../services/assessmentService'
import { apiErrorMessage } from '../../services/api'

const OPTION_LETTERS = ['a', 'b', 'c', 'd']

export default function Assessment() {
  const { questionnaireId } = useParams()
  const navigate = useNavigate()

  const [phase, setPhase] = useState('intro') // intro | taking | result
  const [attempt, setAttempt] = useState(null)
  const [questionnaire, setQuestionnaire] = useState(null)
  const [answers, setAnswers] = useState({})
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [result, setResult] = useState(null)
  const [warning, setWarning] = useState(null)
  const [loading, setLoading] = useState(false)

  const answersRef = useRef(answers)
  answersRef.current = answers
  const endedRef = useRef(false)
  const lastViolationAtRef = useRef(0)

  async function finalizeSubmit() {
    if (endedRef.current || !attempt) return
    endedRef.current = true
    try {
      const graded = await assessmentService.submitAttempt(attempt.id, answersRef.current)
      setResult(graded)
    } catch (err) {
      toast.error(apiErrorMessage(err))
    } finally {
      setPhase('result')
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    }
  }

  const reportViolation = useCallback(
    async (violationType) => {
      if (endedRef.current || phase !== 'taking') return
      const now = Date.now()
      if (now - lastViolationAtRef.current < 1200) return // collapse near-simultaneous events into one strike
      lastViolationAtRef.current = now

      try {
        const res = await assessmentService.logViolation(attempt.id, violationType)
        if (res.action === 'warning') {
          setWarning({ level: 1, text: 'Warning 1 of 2: leaving the assessment window is recorded. A 3rd violation auto-submits your test.' })
        } else if (res.action === 'final_warning') {
          setWarning({ level: 2, text: 'Final warning: one more violation will automatically submit your assessment.' })
        } else if (res.action === 'auto_submit') {
          setWarning({ level: 3, text: 'Assessment auto-submitted due to repeated integrity violations.' })
          finalizeSubmit()
        }
      } catch {
        // if logging itself fails, fail safe by not blocking the trainee further
      }
    },
    [attempt, phase]
  )

  // integrity listeners - only active while actually taking the test
  useEffect(() => {
    if (phase !== 'taking') return

    function onVisibility() {
      if (document.hidden) reportViolation('tab_switch')
    }
    function onBlur() {
      reportViolation('window_blur')
    }
    function onFullscreenChange() {
      if (!document.fullscreenElement) reportViolation('fullscreen_exit')
    }

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('blur', onBlur)
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('blur', onBlur)
      document.removeEventListener('fullscreenchange', onFullscreenChange)
    }
  }, [phase, reportViolation])

  // countdown timer
  useEffect(() => {
    if (phase !== 'taking') return
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval)
          finalizeSubmit()
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  async function beginAssessment() {
    setLoading(true)
    try {
      const data = await assessmentService.startAttempt(questionnaireId)
      setAttempt(data.attempt)
      setQuestionnaire(data.questionnaire)
      setSecondsLeft(data.questionnaire.duration_minutes * 60)
      try {
        await document.documentElement.requestFullscreen()
      } catch {
        toast('Fullscreen could not be enabled - the assessment will still be monitored for tab switches.', { icon: '⚠️' })
      }
      setPhase('taking')
    } catch (err) {
      toast.error(apiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  function selectAnswer(questionId, letter) {
    setAnswers((a) => ({ ...a, [questionId]: letter }))
  }

  async function handleManualSubmit() {
    await finalizeSubmit()
  }

  if (phase === 'intro') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper px-4">
        <div className="card max-w-md w-full p-8 text-center space-y-4">
          <Maximize className="h-8 w-8 mx-auto text-teal-600" />
          <h1 className="font-display text-xl font-semibold">Assessment integrity notice</h1>
          <p className="text-sm text-ink/70">
            This assessment runs in fullscreen. Switching tabs, minimizing the window, or exiting fullscreen is
            logged as a violation — a warning on the 1st and 2nd occurrence, and an automatic submission on the 3rd.
          </p>
          <button onClick={beginAssessment} disabled={loading} className="btn-primary w-full">
            {loading ? 'Starting…' : 'Begin assessment (fullscreen)'}
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'result') {
    const passed = result && result.total_marks > 0 && result.score / result.total_marks * 100 >= 50
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper px-4">
        <div className="card max-w-md w-full p-8 text-center space-y-3">
          {passed ? (
            <CheckCircle2 className="h-10 w-10 mx-auto text-success-600" />
          ) : (
            <XCircle className="h-10 w-10 mx-auto text-amber-600" />
          )}
          <h1 className="font-display text-xl font-semibold">Assessment submitted</h1>
          {result && (
            <p className="text-ink/70">
              Score: <span className="font-semibold">{result.score}</span> / {result.total_marks}
            </p>
          )}
          {result?.status === 'auto_submitted' && (
            <p className="text-sm text-amber-600">This attempt was auto-submitted due to integrity violations.</p>
          )}
          <button onClick={() => navigate(-1)} className="btn-primary w-full mt-2">
            Back to course
          </button>
        </div>
      </div>
    )
  }

  // phase === 'taking'
  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60

  return (
    <div className="min-h-screen bg-paper">
      <div className="sticky top-0 bg-navy-900 text-white px-6 py-3 flex items-center justify-between z-10">
        <p className="font-display font-medium">{questionnaire.title}</p>
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4" />
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
      </div>

      {warning && (
        <div
          className={`px-6 py-2 text-sm flex items-center gap-2 ${
            warning.level >= 2 ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-600'
          }`}
        >
          <ShieldAlert className="h-4 w-4" /> {warning.text}
        </div>
      )}

      <div className="max-w-2xl mx-auto p-6 space-y-5">
        {questionnaire.questions.map((q, idx) => (
          <div key={q.id} className="card p-5">
            <p className="font-medium mb-3">
              {idx + 1}. {q.question_text}
            </p>
            <div className="space-y-2">
              {OPTION_LETTERS.map((letter) => (
                <label
                  key={letter}
                  className={`flex items-center gap-2 rounded border px-3 py-2 text-sm cursor-pointer ${
                    answers[q.id] === letter ? 'border-teal-600 bg-teal-50' : 'border-line'
                  }`}
                >
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    checked={answers[q.id] === letter}
                    onChange={() => selectAnswer(q.id, letter)}
                  />
                  {q[`option_${letter}`]}
                </label>
              ))}
            </div>
          </div>
        ))}

        <button onClick={handleManualSubmit} className="btn-primary w-full">
          Submit assessment
        </button>
      </div>
    </div>
  )
}
