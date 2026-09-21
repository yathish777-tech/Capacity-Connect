import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import toast from 'react-hot-toast'
import { Send, MessageCircleQuestion, FileText } from 'lucide-react'
import Card from '../../components/Card'
import * as courseService from '../../services/courseService'
import * as aiDoubtService from '../../services/aiDoubtService'
import { apiErrorMessage } from '../../services/api'

export default function AiDoubtBot() {
  const [courses, setCourses] = useState([])
  const [courseId, setCourseId] = useState('')
  const [question, setQuestion] = useState('')
  const [asking, setAsking] = useState(false)
  const [thread, setThread] = useState([])

  useEffect(() => {
    courseService.getPublishedCourses().then((data) => {
      setCourses(data)
      if (data.length) setCourseId(String(data[0].id))
    })
  }, [])

  async function handleAsk(e) {
    e.preventDefault()
    if (!question.trim()) return
    const q = question
    setQuestion('')
    setThread((t) => [...t, { role: 'user', text: q }])
    setAsking(true)
    try {
      const res = await aiDoubtService.askDoubtBot(Number(courseId), q)
      setThread((t) => [...t, { role: 'bot', text: res.answer, sources: res.sources }])
    } catch (err) {
      toast.error(apiErrorMessage(err))
      setThread((t) => [...t, { role: 'bot', text: `_${apiErrorMessage(err)}_`, sources: [] }])
    } finally {
      setAsking(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageCircleQuestion className="h-6 w-6 text-teal-600" />
        <h1 className="font-display text-xl font-semibold">RAG Doubtbot</h1>
      </div>
      <p className="text-sm text-ink/60 max-w-2xl">
        Answers are generated only from course material your Admin has approved — if it's not in the approved
        material, the bot will say so instead of guessing.
      </p>

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

      <Card>
        <div className="space-y-4 max-h-[50vh] overflow-y-auto mb-4">
          {thread.length === 0 && (
            <div className="text-center py-8 text-ink/40">
              <MessageCircleQuestion className="h-6 w-6 mx-auto mb-2" />
              Ask a question about the selected course.
            </div>
          )}
          {thread.map((msg, i) => (
            <div key={i} className={msg.role === 'user' ? 'text-right' : 'text-left'}>
              <div
                className={`inline-block rounded-lg px-3 py-2 text-sm max-w-md text-left ${
                  msg.role === 'user' ? 'bg-teal-600 text-white' : 'bg-paper border border-line'
                }`}
              >
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              </div>
              {msg.sources?.length > 0 && (
                <div className="mt-1 space-y-1">
                  {msg.sources.map((s, j) => (
                    <p key={j} className="text-xs text-ink/40 flex items-center gap-1">
                      <FileText className="h-3 w-3" /> {s.material_title}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleAsk} className="flex gap-2">
          <input
            className="input"
            placeholder="e.g. How often should AWS sensors be recalibrated?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <button type="submit" disabled={asking || !courseId} className="btn-primary shrink-0">
            <Send className="h-4 w-4" /> {asking ? 'Asking…' : 'Ask'}
          </button>
        </form>
      </Card>
    </div>
  )
}
