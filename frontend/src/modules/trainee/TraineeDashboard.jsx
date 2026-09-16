import { useEffect, useState } from 'react'
import { Outlet, Link } from 'react-router-dom'
import { LayoutDashboard, UserCircle, BookOpen, Award, MessageCircleQuestion, MessageSquareText, ArrowRight } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout'
import Card from '../../components/Card'
import Loader from '../../components/Loader'
import EmptyState from '../../components/EmptyState'
import StatusBadge from '../../components/StatusBadge'
import * as traineeService from '../../services/traineeService'

export const NAV_ITEMS = [
  { to: '/trainee', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/trainee/profile', label: 'Profile', icon: UserCircle },
  { to: '/trainee/courses', label: 'Courses', icon: BookOpen },
  { to: '/trainee/certificates', label: 'Certificates', icon: Award },
  { to: '/trainee/doubt-bot', label: 'AI Doubt Bot', icon: MessageCircleQuestion },
  { to: '/trainee/feedback', label: 'Feedback', icon: MessageSquareText },
]

export function TraineeOverview() {
  const [enrollments, setEnrollments] = useState(null)

  useEffect(() => {
    traineeService.getMyEnrollments().then(setEnrollments)
  }, [])

  if (!enrollments) return <Loader label="Loading your courses…" />

  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl font-semibold">My Learning</h1>
      <Card title="Enrolled courses">
        {enrollments.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="You're not enrolled in anything yet"
            description="Browse available courses to get started."
          />
        ) : (
          <ul className="divide-y divide-line">
            {enrollments.map((e) => (
              <li key={e.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{e.course.title}</p>
                  <p className="text-sm text-ink/60">{e.course.category}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={e.status} />
                  <Link to={`/trainee/learning/${e.course_id}`} className="btn-secondary text-sm px-3 py-1.5">
                    Continue <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

export default function TraineeDashboard() {
  return (
    <DashboardLayout navItems={NAV_ITEMS}>
      <Outlet />
    </DashboardLayout>
  )
}
