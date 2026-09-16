import { useEffect, useState } from 'react'
import { Network } from 'lucide-react'
import Card from '../../components/Card'
import Loader from '../../components/Loader'
import EmptyState from '../../components/EmptyState'
import * as adminService from '../../services/adminService'

export default function CompetencyEngine() {
  const [courses, setCourses] = useState([])
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [suggestions, setSuggestions] = useState(null)

  useEffect(() => {
    adminService.getAdminCourses().then((data) => {
      setCourses(data)
      if (data.length) setSelectedCourseId(String(data[0].id))
    })
  }, [])

  useEffect(() => {
    if (!selectedCourseId) return
    setSuggestions(null)
    adminService.getTrainerSuggestions(selectedCourseId).then(setSuggestions)
  }, [selectedCourseId])

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-semibold">Competency Engine</h1>
      <p className="text-sm text-ink/60 max-w-2xl">
        Ranks approved trainers against a course's subject tags using proficiency-weighted tag overlap — a quick way
        to see who is best matched before sending a request from Trainer Requirements.
      </p>

      <Card>
        <label className="label">Course</label>
        <select
          className="input max-w-sm"
          value={selectedCourseId}
          onChange={(e) => setSelectedCourseId(e.target.value)}
        >
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </Card>

      <Card title="Ranked trainers">
        {suggestions === null ? (
          <Loader label="Scoring trainers…" />
        ) : suggestions.length === 0 ? (
          <EmptyState icon={Network} title="No competency overlap found" description="No approved trainer shares a tag with this course yet." />
        ) : (
          <ul className="space-y-3">
            {suggestions.map((s) => (
              <li key={s.trainer_id}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium">{s.full_name}</span>
                  <span className="text-ink/50">{Math.round(s.match_score * 100)}%</span>
                </div>
                <div className="h-2 rounded bg-line overflow-hidden">
                  <div className="h-full bg-teal-600" style={{ width: `${Math.round(s.match_score * 100)}%` }} />
                </div>
                <p className="text-xs text-ink/50 mt-1">Matched on: {s.matched_tags.join(', ')}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
