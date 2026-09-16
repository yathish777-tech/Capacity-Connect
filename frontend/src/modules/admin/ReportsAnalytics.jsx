import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import Card from '../../components/Card'
import Loader from '../../components/Loader'
import * as adminService from '../../services/adminService'

export default function ReportsAnalytics() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    adminService.getOverview().then(setStats)
  }, [])

  if (!stats) return <Loader label="Building report…" />

  const rows = stats.enrollments_by_course.map((c) => ({
    ...c,
    completion_rate: c.enrollments > 0 ? Math.round((c.completions / c.enrollments) * 100) : 0,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold">Reports & Analytics</h1>
        <button onClick={() => adminService.downloadReportCsv()} className="btn-secondary text-sm">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <Card title="Completion rate by course">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E5EA" />
            <XAxis dataKey="course" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
            <YAxis unit="%" domain={[0, 100]} />
            <Tooltip formatter={(v) => `${v}%`} />
            <Bar dataKey="completion_rate" fill="#1B6E76" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Course-by-course breakdown">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink/50 border-b border-line">
                <th className="py-2 pr-4">Course</th>
                <th className="py-2 pr-4">Enrollments</th>
                <th className="py-2 pr-4">Completions</th>
                <th className="py-2 pr-4">Completion rate</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.course} className="border-b border-line last:border-0">
                  <td className="py-2 pr-4">{r.course}</td>
                  <td className="py-2 pr-4">{r.enrollments}</td>
                  <td className="py-2 pr-4">{r.completions}</td>
                  <td className="py-2 pr-4">{r.completion_rate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
