import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  UserCheck,
  GraduationCap,
  ClipboardList,
  Network,
  BookOpen,
  Files,
  Award,
  Megaphone,
  BarChart3,
  Download,
} from 'lucide-react'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import DashboardLayout from '../../components/DashboardLayout'
import Card from '../../components/Card'
import Loader from '../../components/Loader'
import * as adminService from '../../services/adminService'

export const NAV_ITEMS = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'User Management', icon: Users },
  { to: '/admin/trainee-approvals', label: 'Trainee Approvals', icon: UserCheck },
  { to: '/admin/trainer-approvals', label: 'Trainer Approvals', icon: GraduationCap },
  { to: '/admin/trainer-requirements', label: 'Trainer Requirements', icon: ClipboardList },
  { to: '/admin/competency-engine', label: 'Competency Engine', icon: Network },
  { to: '/admin/course-management', label: 'Course Management', icon: BookOpen },
  { to: '/admin/course-materials', label: 'Content Management', icon: Files },
  { to: '/admin/certificates', label: 'Certificates', icon: Award },
  { to: '/admin/announcements', label: 'Announcements', icon: Megaphone },
  { to: '/admin/reports', label: 'Reports & Analytics', icon: BarChart3 },
]

const PIE_COLORS = ['#1B6E76', '#C7621B', '#2F7D4F']

function StatCard({ label, value }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-ink/50 uppercase tracking-wide">{label}</p>
      <p className="font-display text-2xl font-semibold mt-1">{value}</p>
    </div>
  )
}

export function AdminOverview() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    adminService.getOverview().then(setStats)
  }, [])

  if (!stats) return <Loader label="Loading overview…" />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold">Overview</h1>
        <button onClick={() => adminService.downloadReportCsv()} className="btn-secondary text-sm">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Pending approvals" value={stats.pending_approvals} />
        <StatCard label="Total users" value={stats.total_users} />
        <StatCard label="Active courses" value={stats.active_courses} />
        <StatCard label="Enrollments" value={stats.total_enrollments} />
        <StatCard label="Completion rate" value={`${stats.completion_rate}%`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Users by role">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={stats.users_by_role} dataKey="count" nameKey="role" outerRadius={80} label>
                {stats.users_by_role.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Enrollments by course">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stats.enrollments_by_course}>
              <XAxis dataKey="course" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="enrollments" fill="#227F88" radius={[4, 4, 0, 0]} />
              <Bar dataKey="completions" fill="#2F7D4F" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  return (
    <DashboardLayout navItems={NAV_ITEMS}>
      <Outlet />
    </DashboardLayout>
  )
}
