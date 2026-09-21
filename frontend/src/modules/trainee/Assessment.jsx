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
      await assessmentService.submitAttempt(attempt.id, answersRef.current)
      const review = await assessmentService.getAttemptReview(attempt.id)
      setResult(review)
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

  function toggleAnswer(questionId, letter) {
    setAnswers((current) => {
      const existing = Array.isArray(current[questionId]) ? current[questionId] : []
      const next = existing.includes(letter) ? existing.filter((item) => item !== letter) : [...existing, letter]
      return { ...current, [questionId]: next }
    })
  }

  function answerLetters(value) {
    if (!value) return []
    return Array.isArray(value) ? value : [value]
  }

  function answerText(question, value) {
    const letters = answerLetters(value)
    if (!letters.length) return 'Skipped'
    return letters.map((letter) => question[`option_${letter}`]).join(', ')
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
    const passed = result && result.total_marks > 0 && result.score / result.total_marks * 100 >= (questionnaire?.passing_score_percent || 50)
    return (
      <div className="min-h-screen py-10 bg-paper px-4">
        <div className="card max-w-2xl mx-auto w-full p-8 space-y-6">
          <div className="text-center space-y-3 mb-8">
            {passed ? (
              <CheckCircle2 className="h-10 w-10 mx-auto text-success-600" />
            ) : (
              <XCircle className="h-10 w-10 mx-auto text-amber-600" />
            )}
            <h1 className="font-display text-2xl font-semibold">
              {passed ? 'Assessment Passed' : 'Assessment Failed'}
            </h1>
            {result && (
              <p className="text-lg font-medium text-ink/80">
                Score: <span className="font-bold text-ink">{result.score}</span> / {result.total_marks}
              </p>
            )}
            {result?.status === 'auto_submitted' && (
              <p className="text-sm text-amber-600">This attempt was auto-submitted due to integrity violations.</p>
            )}
          </div>
          
          {result?.questions && (
            <div className="space-y-4 mt-6">
              <h2 className="font-semibold text-lg border-b border-line pb-2 mb-4">Review Answers</h2>
              {result.questions.map((q, idx) => {
                const traineeAnswer = result.answers?.[q.id]
                const correctAnswer = q.correct_options?.length ? q.correct_options : [q.correct_option]
                const isCorrect = answerLetters(traineeAnswer).sort().join(',') === correctAnswer.slice().sort().join(',')
                return (
                  <div key={q.id} className="p-4 rounded border border-line bg-white/50">
                    <p className="font-medium mb-2">{idx + 1}. {q.question_text}</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-ink/60">Your Answer: </span>
                        <span className={isCorrect ? 'text-success-600 font-medium' : 'text-amber-600 font-medium'}>
                          {answerText(q, traineeAnswer)}
                        </span>
                      </div>
                      {!isCorrect && (
                        <div className="col-span-2 sm:col-span-1">
                          <span className="text-ink/60">Correct Answer: </span>
                          <span className="text-success-600 font-medium">{answerText(q, correctAnswer)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="flex gap-4 mt-6">
            {!passed && result && (
              <button
                onClick={() => {
                  const reason = prompt('Please enter a reason for requesting a re-attempt:')
                  if (reason) {
                    assessmentService.requestReattempt(result.id, reason)
                      .then(() => toast.success('Re-attempt requested. An admin/trainer will review it.'))
                      .catch((err) => toast.error(apiErrorMessage(err)))
                  }
                }}
                className="btn border border-line flex-1"
              >
                Request Re-attempt
              </button>
            )}
            <button onClick={() => navigate(-1)} className="btn-primary flex-1">
              Back to course
            </button>
          </div>
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
                    answerLetters(answers[q.id]).includes(letter) ? 'border-teal-600 bg-teal-50' : 'border-line'
                  }`}
                >
                  {q.is_multi_answer ? (
                    <input
                      type="checkbox"
                      checked={answerLetters(answers[q.id]).includes(letter)}
                      onChange={() => toggleAnswer(q.id, letter)}
                    />
                  ) : (
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      checked={answers[q.id] === letter}
                      onChange={() => selectAnswer(q.id, letter)}
                    />
                  )}
                  {q[`option_${letter}`]}
                </label>
              ))}
              {q.is_multi_answer && <p className="text-xs text-ink/50">Select all correct options.</p>}
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
