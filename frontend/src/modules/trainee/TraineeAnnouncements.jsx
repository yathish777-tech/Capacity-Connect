import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import Card from '../../components/Card'
import Loader from '../../components/Loader'
import EmptyState from '../../components/EmptyState'
import * as traineeService from '../../services/traineeService'

export default function TraineeAnnouncements() {
  const [announcements, setAnnouncements] = useState(null)

  useEffect(() => {
    traineeService.getAnnouncements().then(setAnnouncements)
  }, [])

  if (!announcements) return <Loader label="Loading announcements…" />

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-semibold">Announcements</h1>

      {announcements.length === 0 ? (
        <Card>
          <EmptyState icon={Bell} title="No announcements" description="Check back later for updates." />
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => (
            <Card key={a.id}>
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-lg">{a.title}</h3>
                <span className="text-xs text-ink/50 bg-paper px-2 py-1 rounded border border-line capitalize">
                  {a.category}
                </span>
              </div>
              <p className="text-sm text-ink/80 whitespace-pre-wrap">{a.content}</p>
              <div className="mt-4 pt-3 border-t border-line flex justify-between items-center text-xs text-ink/50">
                <span>By {a.author_name}</span>
                <span>{new Date(a.created_at).toLocaleString()}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

