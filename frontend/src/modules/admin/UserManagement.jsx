import { useEffect, useMemo, useState } from 'react'
import { Users } from 'lucide-react'
import Card from '../../components/Card'
import Loader from '../../components/Loader'
import EmptyState from '../../components/EmptyState'
import StatusBadge from '../../components/StatusBadge'
import * as adminService from '../../services/adminService'

export default function UserManagement() {
  const [users, setUsers] = useState(null)
  const [roleFilter, setRoleFilter] = useState('all')

  useEffect(() => {
    adminService.getUsers().then(setUsers)
  }, [])

  const filtered = useMemo(() => {
    if (!users) return []
    return roleFilter === 'all' ? users : users.filter((u) => u.role === roleFilter)
  }, [users, roleFilter])

  if (!users) return <Loader label="Loading users…" />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold">User Management</h1>
        <select className="input w-40" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="all">All roles</option>
          <option value="admin">Admin</option>
          <option value="trainer">Trainer</option>
          <option value="trainee">Trainee</option>
        </select>
      </div>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState icon={Users} title="No users found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink/50 border-b border-line">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Employee ID</th>
                  <th className="py-2 pr-4">Role</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Joined</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-b border-line last:border-0">
                    <td className="py-2 pr-4">{u.profile?.full_name || '—'}</td>
                    <td className="py-2 pr-4 text-ink/70">{u.email}</td>
                    <td className="py-2 pr-4 text-ink/70">{u.profile?.employee_id || '—'}</td>
                    <td className="py-2 pr-4 capitalize">{u.role}</td>
                    <td className="py-2 pr-4">
                      <StatusBadge status={u.status} />
                    </td>
                    <td className="py-2 pr-4 text-ink/50">{new Date(u.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
