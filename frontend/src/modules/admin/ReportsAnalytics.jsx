import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import Card from '../../components/Card'
import Loader from '../../components/Loader'
import * as adminService from '../../services/adminService'

function shortCourseName(name = '') {
  return name.length > 22 ? `${name.slice(0, 22)}…` : name
}

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
  const completionChartHeight = Math.max(220, rows.length * 42)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold">Reports & Analytics</h1>
        <button onClick={() => adminService.downloadReportCsv()} className="btn-secondary text-sm">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <Card title="Completion rate by course">
        <ResponsiveContainer width="100%" height={completionChartHeight}>
          <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E5EA" />
            <XAxis type="number" unit="%" domain={[0, 100]} />
            <YAxis
              type="category"
              dataKey="course"
              width={170}
              tick={{ fontSize: 12 }}
              tickFormatter={shortCourseName}
            />
            <Tooltip formatter={(v) => `${v}%`} />
            <Bar dataKey="completion_rate" fill="#1B6E76" radius={[0, 4, 4, 0]} />
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
